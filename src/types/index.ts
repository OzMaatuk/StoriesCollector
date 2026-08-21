export * from './translations';
export interface Story {
  id: string;
  name: string;
  phone?: string | null;
  email: string;
  city?: string | null;
  country?: string | null;
  tellerBackground?: string | null;
  storyBackground?: string | null;
  title?: string | null;
  content: string;
  language: string;
  verifiedEmail: boolean;
  selectedEnrichmentId?: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  generatedContents?: GeneratedContent[];
}

/** Fields that may be returned to unauthenticated visitors. */
export type PublicStory = Omit<Story, 'email' | 'phone'>;

export interface GeneratedContent {
  id: string;
  storyId: string;
  providerName: string;
  modelName: string;
  generatedText?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string | null;
  version?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryCreateInput {
  name: string;
  phone?: string;
  email: string;
  city?: string;
  country?: string;
  tellerBackground?: string;
  storyBackground?: string;
  title?: string;
  content: string;
  language: string;
  verifiedEmail?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export type Language = 'en' | 'he' | 'fr';

export interface VerificationRequest {
  phone: string;
}

export interface VerificationVerify {
  phone: string;
  code: string;
}
