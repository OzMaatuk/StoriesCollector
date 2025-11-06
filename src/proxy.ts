// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { languages } from '@/lib/i18n';
import { Language } from './types';

function getPreferredLanguage(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return 'en';

  const preferredLanguages = acceptLanguage
    .split(',')
    .map((l) => l.split(';')[0].trim().substring(0, 2).toLowerCase());

  const matchedLanguage = preferredLanguages.find((lang) => languages.includes(lang as Language));

  return matchedLanguage ?? 'en';
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Exclude API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Check if the pathname already has a supported language
  const pathnameHasLanguage = languages.some(
    (lang) => pathname.startsWith(`/${lang}/`) || pathname === `/${lang}`
  );

  if (pathnameHasLanguage) return NextResponse.next();

  // Redirect to preferred language
  const language = getPreferredLanguage(request);
  return NextResponse.redirect(
    new URL(`/${language}${pathname === '/' ? '' : pathname}`, request.url)
  );
}
