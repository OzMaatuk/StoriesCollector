import { OtpService } from '@/services/otp.service';

// Mock modules first
// Import required modules
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Set up mock functions
const mockSendMail = jest.fn().mockResolvedValue({});
const mockTransport = { sendMail: mockSendMail };
const mockCreateTransport = jest.fn().mockReturnValue(mockTransport);

const mockPost = jest.fn().mockResolvedValue({});

// Now mock modules
jest.mock('nodemailer');
(nodemailer.createTransport as jest.Mock) = mockCreateTransport;

jest.mock('axios');
(axios.post as jest.Mock) = mockPost;

describe('OtpService providers', () => {
  let otpService: OtpService;

  beforeEach(() => {
    // Clear env vars before each test
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;

    delete process.env.TEXTBEE_BASE_URL;
    delete process.env.TEXTBEE_DEVICE_ID;
    delete process.env.TEXTBEE_API_KEY;

    jest.clearAllMocks();
    // Re-instantiate because we need the constructor to pick up new env vars
    delete require.cache[require.resolve('@/services/otp.service')];
    const { OtpService } = require('@/services/otp.service');
    otpService = new OtpService();
  });

  it('uses nodemailer when SMTP env vars are present', async () => {
    process.env.SMTP_HOST = 'smtp.zoho.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'test@domain.com';
    process.env.SMTP_PASS = 'pass';
    process.env.EMAIL_FROM = 'no-reply@domain.com';

    const result = await otpService.sendOtp('user@example.com', 'email');
    expect(result.expiresIn).toBe(parseInt(process.env.OTP_CODE_TTL_SECONDS || '300', 10));

    // nodemailer.createTransport should have been called
    expect(nodemailer.createTransport).toHaveBeenCalled();
    // The mock createTransport returns a transporter instance; grab the instance
    // that was returned when the service called createTransport (recorded by Jest)
    const createCalls = (nodemailer.createTransport as jest.Mock).mock.results;
    expect(createCalls.length).toBeGreaterThan(0);
    const transporter = createCalls[0].value;
    expect(transporter).toBeDefined();
    expect(transporter.sendMail).toHaveBeenCalled();
  });

  it('uses axios/TextBee when TEXTBEE env vars are present', async () => {
    process.env.TEXTBEE_BASE_URL = 'https://api.textbee.example';
    process.env.TEXTBEE_DEVICE_ID = 'device1';
    process.env.TEXTBEE_API_KEY = 'apikey';

    const result = await otpService.sendOtp('+1234567890', 'sms');
    expect(result.expiresIn).toBe(parseInt(process.env.OTP_CODE_TTL_SECONDS || '300', 10));

    // axios.post should have been called
    expect(axios.post).toHaveBeenCalled();

    // Check that the URL contained the base and device id
    const postCalls = (axios.post as jest.Mock).mock.calls;
    expect(postCalls.length).toBeGreaterThan(0);
    const callArgs = postCalls[0];
    const url = callArgs[0];
    expect(url).toContain('api.textbee.example');
    expect(url).toContain('/gateway/devices/device1/send-sms');
  });

  it('falls back to console.log when providers are not configured', async () => {
    // No env vars set
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const resSms = await otpService.sendOtp('+1234567890', 'sms');
    expect(resSms.expiresIn).toBe(parseInt(process.env.OTP_CODE_TTL_SECONDS || '300', 10));

    const resEmail = await otpService.sendOtp('user@example.com', 'email');
    expect(resEmail.expiresIn).toBe(parseInt(process.env.OTP_CODE_TTL_SECONDS || '300', 10));

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
