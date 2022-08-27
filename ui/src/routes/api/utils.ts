import type { RequestEvent } from '@sveltejs/kit';

export function getUrlSearchParam(event: RequestEvent): string | null {
  const searchParams = new URL(event.request.url).searchParams;
  return searchParams.get('url');
}
