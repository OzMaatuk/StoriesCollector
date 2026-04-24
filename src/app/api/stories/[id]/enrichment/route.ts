// src/app/api/stories/[id]/enrichment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { StoryRepository } from '@/repositories/story.repository';
import { HTTP_STATUS } from '@/lib/constants';

const repository = new StoryRepository();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const enrichments = await repository.getGeneratedContentsByStoryId(id);

    if (!enrichments || enrichments.length === 0) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(enrichments);
  } catch (error) {
    console.error('Error fetching enrichments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST endpoint to trigger generation of a new enrichment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let enrichmentId: string | undefined;
    try {
      const body = await request.json();
      enrichmentId = body.enrichmentId;
    } catch (e) {
      console.warn(e)
    }

    // Validate story exists
    const story = await repository.findById(id);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Trigger enrichment generation (service will create a new record or update existing)
    // Import lazily to avoid circular dependencies at top level
    const { EnrichmentService } = await import('@/services/enrichment.service');
    const service = new EnrichmentService();

    // Run asynchronously to prevent Netlify serverless timeout
    service.enrichStory(story, enrichmentId).catch((error) => {
      console.error(`Background enrichment failed for story ${id}:`, error);
    });

    return NextResponse.json({ success: true }, { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('Error generating enrichment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enrichmentId } = body;

    if (!enrichmentId) {
      return NextResponse.json(
        { error: 'enrichmentId is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate story exists
    const story = await repository.findById(id);
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Validate enrichment exists and belongs to the story
    const enrichment = await repository.getGeneratedContentById(enrichmentId);
    if (!enrichment || enrichment.storyId !== id) {
      return NextResponse.json(
        { error: 'Enrichment not found or does not belong to this story' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Saving = mark this enrichment as the selected (published) version for the story.
    // The poll loop in the UI will re-fetch and reflect the saved state.
    await repository.updateSelectedEnrichment(id, enrichmentId);

    return NextResponse.json({ success: true }, { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('Error selecting enrichment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
