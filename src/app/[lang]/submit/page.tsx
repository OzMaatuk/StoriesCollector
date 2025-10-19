import StoryForm from '@/components/StoryForm';
import { Language } from '@/types';

interface PageProps {
  params: { lang: Language };
}

export default function SubmitPage({ params }: PageProps) {
  const translations = require(`@/locales/${params.lang}.json`);

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {translations.nav.submit}
        </h1>
      </div>
      <StoryForm translations={translations} lang={params.lang} />
    </div>
  );
}