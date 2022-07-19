import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import type { MaybePromise } from '@sveltejs/kit/types/private';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({
  event,
  resolve,
}: {
  event: RequestEvent;
  resolve: (event: RequestEvent, opts?: ResolveOptions) => MaybePromise<Response>;
}) {
  return resolve(event, { ssr: false });
}
