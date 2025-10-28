import Link from 'next/link';
import { Language } from '@/types';
import { getTranslations } from '@/lib/translations';

interface PageProps {
  params: { lang: Language };
}

export default function HomePage({ params }: PageProps) {
  if (!params?.lang) {
    console.error('Language parameter is missing');
    return null;
  }

  const translations = getTranslations(params.lang);

  if (!translations) {
    console.error('Translations are missing for language:', params.lang);
    return null;
  }

  if (!translations.home) {
    console.error('Home translations are missing for language:', params.lang, translations);
    return null;
  }

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-gray-900">{translations.home.title}</h1>
        <p className="text-xl text-gray-600">{translations.home.subtitle}</p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">{translations.home.description}</p>
      </div>

      <div className="flex justify-center space-x-4">
        <Link
          href={`/${params.lang}/submit`}
          className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium text-lg"
        >
          {translations.home.cta}
        </Link>
        <Link
          href={`/${params.lang}/stories`}
          className="bg-white text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors font-medium text-lg"
        >
          {translations.home.viewStories}
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">Share Your Story</h3>
          <p className="text-gray-600">Submit your personal experiences and connect with others</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-4xl mb-4">🌐</div>
          <h3 className="text-lg font-semibold mb-2">Multilingual Support</h3>
          <p className="text-gray-600">Read and write stories in English, Hebrew, or French</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
          <p className="text-gray-600">
            Your information is protected with industry-standard security
          </p>
        </div>
      </div>
    </div>
  );
}
