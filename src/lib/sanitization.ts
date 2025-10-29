import DOMPurify from 'isomorphic-dompurify';

export function sanitizeString(input: string | undefined | null): string | undefined {
  if (!input) return undefined;

  // Remove any HTML tags and sanitize
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Trim whitespace
  return sanitized.trim() || undefined;
}

export function sanitizeContent(content: string | undefined | null): string | undefined {
  // Allow basic formatting for story content
  if (!content) return undefined;
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeStoryInput(
  input: Record<string, string | undefined>
): Record<string, string | undefined> {
  return {
    name: sanitizeString(input.name),
    phone: sanitizeString(input.phone),
    email: sanitizeString(input.email),
    city: sanitizeString(input.city),
    country: sanitizeString(input.country),
    tellerBackground: sanitizeString(input.tellerBackground),
    storyBackground: sanitizeString(input.storyBackground),
    title: sanitizeString(input.title),
    content: sanitizeContent(input.content),
    language: sanitizeString(input.language),
  };
}
