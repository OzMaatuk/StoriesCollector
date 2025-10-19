import StoryList from '@/components/StoryList';
import { StoryService } from '@/services/story.service';
import { Language } from '@/types';

interface PageProps {
  params: { lang: Language };
}

export default async function StoriesPage({ params }: PageProps) {
  const translations = require(`@/locales/${params.lang}.json`);
  const storyService = new StoryService();
  
  const initialData = await storyService.getStories({
    page: 1,
    pageSize: 10,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {translations.stories.title}
        </h1>
      </div>
      <StoryList 
        initialData={initialData} 
        lang={params.lang} 
        translations={translations} 
      />
    </div>
  );
}