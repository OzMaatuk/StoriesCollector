// src/app/api/stories/[id]/enrichment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { StoryRepository } from '@/repositories/story.repository';
import { EnrichmentService } from '@/services/enrichment.service';
import { ENRICHMENT, HTTP_STATUS } from '@/lib/constants';
import { logger } from '@/lib/logger';

const repository = new StoryRepository();
const enrichmentService = new EnrichmentService();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const enrichment = await repository.getGeneratedContentByStoryId(id);

    if (!enrichment) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(enrichment);
  } catch (error) {
    console.error('Error fetching enrichment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate story exists
    const story = await repository.findById(id);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Get current enrichment record
    const enrichment = await repository.getGeneratedContentByStoryId(id);
    if (!enrichment) {
      return NextResponse.json(
        { error: 'No enrichment record found for this story' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Check retry limit
    if (enrichment.retryCount >= ENRICHMENT.MAX_RETRIES) {
      return NextResponse.json(
        { 
          error: `Retry limit (${ENRICHMENT.MAX_RETRIES}) exceeded`,
          retryCount: enrichment.retryCount,
          maxRetries: ENRICHMENT.MAX_RETRIES,
        },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    // Trigger retry enrichment asynchronously
    enrichmentService.enrichStory(story, true).catch((error) => {
      logger.error(`Background enrichment retry failed for story ${id}`, error as Error);
    });

    // Return current enrichment state with updated retryCount
    const updatedEnrichment = await repository.getGeneratedContentByStoryId(id);
    return NextResponse.json(updatedEnrichment, { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('Error triggering enrichment retry:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
