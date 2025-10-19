import { NextRequest, NextResponse } from 'next/server';
import { StoryService } from '@/services/story.service';
import { rateLimit } from '@/lib/rate-limit';

const storyService = new StoryService();

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const story = await storyService.createStory(body);

    return NextResponse.json(story, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '10',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
      },
    });
  } catch (error) {
    console.error('Error creating story:', error);

    if (error instanceof Error && error.message.startsWith('{')) {
      // Validation error
      try {
        const validationErrors = JSON.parse(error.message);
        return NextResponse.json(
          { error: 'Validation failed', details: validationErrors },
          { status: 400 }
        );
      } catch {
        // Fall through to generic error
      }
    }

    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const language = searchParams.get('language') || undefined;

    const result = await storyService.getStories({ page, pageSize, language });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}