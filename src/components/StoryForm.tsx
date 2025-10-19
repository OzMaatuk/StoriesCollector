'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface StoryFormProps {
  translations: any;
  lang: string;
}

export default function StoryForm({ translations, lang }: StoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
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

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
          <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium">{translations.form.submitSuccess}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">{translations.form.title}</h2>
        <p className="text-sm text-gray-600 mb-6">{translations.form.requiredFields}</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
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

        {/* Phone - Required */}
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.phone} *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder={translations.form.phonePlaceholder}
            required
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <p className="mt-1 text-sm text-gray-500">{translations.form.phoneHint}</p>
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone[0]}</p>}
        </div>

        {/* Email - Optional */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            {translations.form.email}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={translations.form.emailPlaceholder}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
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
          <label htmlFor="tellerBackground" className="block text-sm font-medium text-gray-700 mb-2">
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
          {errors.tellerBackground && <p className="mt-1 text-sm text-red-600">{errors.tellerBackground[0]}</p>}
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
          {errors.storyBackground && <p className="mt-1 text-sm text-red-600">{errors.storyBackground[0]}</p>}
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
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? translations.common.loading : translations.common.submit}
        </button>
      </div>
    </form>
  );
}