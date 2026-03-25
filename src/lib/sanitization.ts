function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

function stripHtmlAllowBasic(input: string): string {
  return input.replace(/<(?!\/?(?:p|br|strong|em|u)(?:\s|\/?>))[^>]*>/gi, '');
}

export function sanitizeString(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  return stripHtml(input).trim() || undefined;
}

export function sanitizeContent(content: string | undefined | null): string | undefined {
  if (!content) return undefined;
  return stripHtmlAllowBasic(content).trim() || undefined;
}

export function sanitizeStoryInput(
  input: Record<string, string | undefined>
): Record<string, string | undefined> {
  return {
    name: sanitizeString(input.name),
    phone: sanitizeString(input.phone),
    email: sanitizeString(input.email)?.toLowerCase(),
    city: sanitizeString(input.city),
    country: sanitizeString(input.country),
    tellerBackground: sanitizeString(input.tellerBackground),
    storyBackground: sanitizeString(input.storyBackground),
    title: sanitizeString(input.title),
    content: sanitizeContent(input.content),
    language: sanitizeString(input.language),
  };
}
