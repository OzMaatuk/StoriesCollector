export interface Story {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  tellerBackground?: string | null;
  storyBackground?: string | null;
  title?: string | null;
  content: string;
  language: string;
  verifiedPhone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryCreateInput {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  country?: string;
  tellerBackground?: string;
  storyBackground?: string;
  title?: string;
  content: string;
  language: string;
  verifiedPhone?: boolean;
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
