// src/components/StoryForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Translations } from '@/types/translations';
import { Language } from '@/types';

interface StoryFormProps {
  translations: Translations;
  lang: Language;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  tellerBackground: string;
  storyBackground: string;
  title: string;
  content: string;
  language: string;
}

export default function StoryForm({ translations, lang }: StoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    city: '',
    country: '',
    tellerBackground: '',
    storyBackground: '',
    title: '',
    content: '',
    language: lang,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  // OTP verification states
  const [otpStep, setOtpStep] = useState<'form' | 'otp' | 'verified'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpRecipient, setOtpRecipient] = useState('');
  const [otpChannel, setOtpChannel] = useState<'email' | 'sms'>('email');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const determineOtpMethod = () => {
    // Priority: email > phone
    if (formData.email && formData.email.trim() !== '') {
      return { recipient: formData.email.trim(), channel: 'email' as const };
    } else if (formData.phone && formData.phone.trim() !== '') {
      return { recipient: formData.phone.trim(), channel: 'sms' as const };
    }
    return null;
  };

  const handleSendOtp = async () => {
    const otpMethod = determineOtpMethod();
    if (!otpMethod) {
      setError('Please provide either an email address or phone number');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: otpMethod.recipient,
          channel: otpMethod.channel,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setOtpError(data.error || 'Failed to send verification code');
        return;
      }

      setOtpRecipient(otpMethod.recipient);
      setOtpChannel(otpMethod.channel);
      setOtpStep('otp');
    } catch (err) {
      console.error('Error sending OTP:', err);
      setOtpError('Failed to send verification code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter a 6-digit verification code');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: otpRecipient,
          code: otpCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setOtpError(data.error || 'Invalid verification code');
        return;
      }

      const data = await response.json();
      setVerificationToken(data.token);
      setOtpStep('verified');
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setOtpError('Failed to verify code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if we need OTP verification first
    if (otpStep === 'form') {
      // Validate that at least one contact method is provided
      const hasPhone = formData.phone && formData.phone.trim() !== '';
      const hasEmail = formData.email && formData.email.trim() !== '';

      if (!hasPhone && !hasEmail) {
        setError('Please provide either an email address or phone number');
        return;
      }

      // Send OTP
      await handleSendOtp();
      return;
    }

    if (otpStep === 'otp') {
      // Verify OTP
      await handleVerifyOtp();
      return;
    }

    // Submit story (otpStep === 'verified')
    setLoading(true);
    setError(null);
    setErrors({});

    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          verificationToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.details) {
          setErrors(data.details);
        } else {
          setError(data.error || translations.form.submitError);
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${lang}/stories`);
      }, 2000);
    } catch (err) {
      console.error('Error submitting story:', err);
      setError(translations.form.submitError);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <svg
            className="w-6 h-6 text-green-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium">{translations.form.submitSuccess}</p>
        </div>
      </div>
    );
  }

  // OTP verification step
  if (otpStep === 'otp') {
    return (
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">
            Verify Your {otpChannel === 'email' ? 'Email' : 'Phone'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            We&apos;ve sent a 6-digit verification code to {otpRecipient}
          </p>

          {otpError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{otpError}</p>
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              id="otpCode"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={otpLoading || otpCode.length !== 6}
              className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {otpLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => setOtpStep('form')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium transition-colors"
            >
              Back
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              Resend Code
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">{translations.form.title}</h2>
        <p className="text-sm text-gray-600 mb-6">
          {otpStep === 'verified' ? (
            <>Contact verified! Please complete your story submission.</>
          ) : (
            <>Please provide either an email address or phone number for verification.</>
          )}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {otpStep === 'verified' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-green-800">
                {otpChannel === 'email' ? 'Email' : 'Phone'} verified: {otpRecipient}
              </p>
            </div>
          </div>
        )}

        {/* Name - Required */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.name} *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={translations.form.namePlaceholder}
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
        </div>

        {/* Contact Information Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            {translations.form.contactInfo}
          </h3>
          <p className="text-sm text-blue-700 mb-4">{translations.form.contactInfoHint}</p>

          {/* Email - Preferred */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {translations.form.email} (Preferred)
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={translations.form.emailPlaceholder}
              disabled={otpStep === 'verified'}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } ${otpStep === 'verified' ? 'bg-gray-100' : ''}`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
          </div>

          {/* Phone - Alternative */}
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {translations.form.phone} (Alternative)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={translations.form.phonePlaceholder}
              disabled={otpStep === 'verified'}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              } ${otpStep === 'verified' ? 'bg-gray-100' : ''}`}
            />
            <p className="mt-1 text-sm text-gray-500">{translations.form.phoneHint}</p>
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>}
          </div>
        </div>

        {/* City - Optional */}
        <div className="mb-4">
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.city}
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder={translations.form.cityPlaceholder}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.city ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city[0]}</p>}
        </div>

        {/* Country - Optional */}
        <div className="mb-4">
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.country}
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder={translations.form.countryPlaceholder}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.country ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country[0]}</p>}
        </div>

        {/* Teller Background - Optional */}
        <div className="mb-4">
          <label
            htmlFor="tellerBackground"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {translations.form.tellerBackground}
          </label>
          <textarea
            id="tellerBackground"
            name="tellerBackground"
            value={formData.tellerBackground}
            onChange={handleChange}
            placeholder={translations.form.tellerBackgroundPlaceholder}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.tellerBackground ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.tellerBackground && (
            <p className="mt-1 text-sm text-red-600">{errors.tellerBackground[0]}</p>
          )}
        </div>

        {/* Story Background - Optional */}
        <div className="mb-4">
          <label htmlFor="storyBackground" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.storyBackground}
          </label>
          <textarea
            id="storyBackground"
            name="storyBackground"
            value={formData.storyBackground}
            onChange={handleChange}
            placeholder={translations.form.storyBackgroundPlaceholder}
            rows={3}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.storyBackground ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.storyBackground && (
            <p className="mt-1 text-sm text-red-600">{errors.storyBackground[0]}</p>
          )}
        </div>

        {/* Story Title - Optional */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.storyTitle}
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder={translations.form.storyTitlePlaceholder}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title[0]}</p>}
        </div>

        {/* Content - Required */}
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.content} *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder={translations.form.contentPlaceholder}
            rows={8}
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content[0]}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || (otpStep === 'form' && !formData.email && !formData.phone)}
          className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading
            ? translations.common.loading
            : otpStep === 'form'
            ? translations.common.sendVerificationCode
            : translations.common.submit}
        </button>
      </div>
    </form>
  );
}
