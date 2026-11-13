'use server';

import { searchSpeakingTopicIdeas } from '@/lib/api/queries';
import type { SpeakingIdeaSearchHit } from '@/lib/api/normalize';

/** Ideas search for the topic screen. The wordsapi client only runs on the server. */
export async function searchSpeakingIdeas(
  topicId: number,
  query: string
): Promise<SpeakingIdeaSearchHit[]> {
  const q = query.trim().slice(0, 80);
  if (!Number.isInteger(topicId) || topicId <= 0 || q.length === 0) return [];
  return searchSpeakingTopicIdeas(topicId, q);
}
