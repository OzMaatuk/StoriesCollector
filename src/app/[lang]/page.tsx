// src/app/[lang]/page.tsx
import Link from 'next/link';
import { Language } from '@/types';
import { getTranslations } from '@/lib/translations';

interface PageProps {
  params: Promise<{ lang: Language }>;
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;

  if (!lang) {
    console.error('Language parameter is missing');
    return null;
  }

  const translations = getTranslations(lang);

  if (!translations?.home) {
    console.error('Translations are missing for language:', lang);
    return null;
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-3 pb-8">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-black text-primary-600 drop-shadow-lg tracking-tight leading-tight">
            {translations.home.title}
          </h1>
          <div className="flex justify-center">
            <div className="h-1 w-24 bg-gradient-to-r from-primary-600 to-primary-700 rounded-full"></div>
          </div>
        </div>
        <p className="text-2xl font-semibold text-gray-700">{translations.home.subtitle}</p>
      </div>

      {/* Description Sections */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* What is this section */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{translations.home.whatIsThis}</h2>
          <p className="text-gray-700 leading-relaxed">{translations.home.descriptionPart1}</p>
        </div>

        {/* Your Invitation section */}
        <div className="bg-blue-50 rounded-xl p-8 shadow-sm border border-blue-100">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            {translations.home.yourInvitation}
          </h2>
          <p className="text-blue-800 leading-relaxed">{translations.home.descriptionPart2}</p>
        </div>

        {/* Guidelines section */}
        <div className="bg-green-50 rounded-xl p-8 shadow-sm border border-green-100">
          <h2 className="text-2xl font-bold text-green-900 mb-4">{translations.home.guidelines}</h2>
          <ul className="space-y-3 text-green-800">
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">✓</span>
              <span className="leading-relaxed">{translations.home.guideWrite}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">✓</span>
              <span className="leading-relaxed">{translations.home.guideRespect}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-1">✓</span>
              <span className="leading-relaxed">{translations.home.guideAuthentic}</span>
            </li>
          </ul>
        </div>

        {/* Future Vision section */}
        <div className="bg-purple-50 rounded-xl p-8 shadow-sm border border-purple-100">
          <h2 className="text-2xl font-bold text-purple-900 mb-4">
            {translations.home.futureVision}
          </h2>
          <p className="text-purple-800 leading-relaxed">{translations.home.descriptionPart3}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 flex-wrap pt-8">
        <Link
          href={`/${lang}/submit`}
          className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-lg shadow-md hover:shadow-lg"
        >
          {translations.home.cta}
        </Link>
        <Link
          href={`/${lang}/stories`}
          className="bg-white text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors font-semibold text-lg shadow-md"
        >
          {translations.home.viewStories}
        </Link>
      </div>
    </div>
  );
}
