// src/app/api/stories/[id]/enrichment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { StoryRepository } from '@/repositories/story.repository';

const repository = new StoryRepository();

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
