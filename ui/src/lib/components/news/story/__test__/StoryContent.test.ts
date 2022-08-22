import { render, type RenderResult } from '@testing-library/svelte';
import StoryContent from '../StoryContent.svelte';
import fetchMock from 'jest-fetch-mock';

describe('StoryComponent', () => {
  jest.setTimeout(60000);

  beforeAll(() => {
    fetchMock.enableMocks();
  });

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('show content', async () => {
    // given
    fetchMock.mockResponseOnce('<div>Beispiel Inhalt</div>');

    // when
    const { findByTestId } = renderStoryComponent();

    // then
    const content = await findByTestId('story-content');
    expect(content.textContent).toBe('Beispiel Inhalt');
  });

  it('show loading indicator', () => {
    // when
    const { getByTestId } = renderStoryComponent();

    // then
    expect(getByTestId('story-content-skeleton')).toBeVisible();
  });

  it('show error message', async () => {
    // given
    fetchMock.mockReturnValue(Promise.resolve(new Response(null, { status: 500 })));

    // when
    const { findByTestId } = renderStoryComponent();

    // then
    const content = await findByTestId(
      'story-content-error',
      {},
      {
        timeout: 60000,
        interval: 1000,
      },
    );
    const textContent = normalizeText(content.textContent);
    expect(textContent).toBe('Inhalt kann nicht angezeigt werden. Klicken Sie hier um zum Artikel zu gelangen.');
  });
});

function renderStoryComponent(): RenderResult {
  return render(StoryContent, {
    props: { id: 'news:1234567', url: 'https://orf.at/stories/1234567' },
  });
}

function normalizeText(text?: string | null): string | null {
  if (!text) {
    return null;
  }
  return text.replace('\n', ' ').replace(/\s{2,}/g, ' ');
}
