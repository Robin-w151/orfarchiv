import news from '$lib/data/news.data';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get() {
  await wait(1500);
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: news,
  };
}

function wait(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
