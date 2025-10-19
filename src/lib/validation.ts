import { z } from 'zod';

// E.164 phone number format: + followed by 1-15 digits
const phoneRegex = /^\+[1-9]\d{1,14}$/;

export const storySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  tellerBackground: z.string().max(5000).optional(),
  storyBackground: z.string().max(5000).optional(),
  title: z.string().max(500).optional(),
  content: z.string().min(10, 'Story must be at least 10 characters').max(50000),
  language: z.enum(['en', 'he', 'fr']),
});

export const verificationRequestSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'),
});

export const verificationVerifySchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export type Story = z.infer<typeof storySchema>;
export type VerificationRequest = z.infer<typeof verificationRequestSchema>;
export type VerificationVerify = z.infer<typeof verificationVerifySchema>;
