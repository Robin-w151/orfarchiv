const { test, expect } = require('@playwright/test');
const moment = require('moment');

const baseUrl = process.env.ENVIRONMENT_URL || process.env.ORFARCHIV_BASE_URL || 'https://orfarchiv.news';

const newsMock = {
  stories: [
    {
      id: 'news:3284304',
      title: 'Frankfurt geht bei CL-Debüt baden',
      category: 'Sport',
      url: 'https://orf.at/stories/3284304/',
      timestamp: '2022-09-07T18:47:35.000Z',
      source: 'news',
    },
    {
      id: 'news:3284303',
      title: 'WIFO-Ökonom Böheim zu Strompreisbremse',
      category: 'Medien',
      url: 'https://orf.at/stories/3284303/',
      timestamp: '2022-09-06T18:20:50.000Z',
      source: 'news',
    },
    {
      id: 'news:3284215',
      title: 'Die Abrechnung des John Malkovich',
      category: 'Kultur',
      url: 'https://orf.at/stories/3284215/',
      timestamp: '2022-09-05T18:06:00.000Z',
      source: 'news',
    },
    {
      id: 'news:3284302',
      title: 'OMV: „Kein einklagbares Fehlverhalten“ bei Ex-Chef Seele',
      category: 'Wirtschaft',
      url: 'https://orf.at/stories/3284302/',
      timestamp: '2022-09-04T17:57:19.000Z',
      source: 'news',
    },
    {
      id: 'news:3284301',
      title: 'Bolsonaro nutzt Unabhängigkeitstag für Wahlkampf',
      category: 'Ausland',
      url: 'https://orf.at/stories/3284301/',
      timestamp: '2022-09-03T17:37:36.000Z',
      source: 'news',
    },
  ],
  prevKey: {
    id: 'news:3284304',
    timestamp: '2022-09-07T18:47:35.000Z',
    type: 'prev',
  },
  nextKey: {
    id: 'news:3284301',
    timestamp: '2022-09-03T17:37:36.000Z',
    type: 'next',
  },
};
const newsMockMore = {
  stories: [
    {
      id: 'noe:3172657',
      title: 'E-Bike-Lenker fuhr gegen Lkw und starb',
      category: 'Chronik',
      url: 'https://noe.orf.at/stories/3172657/',
      timestamp: '2022-09-03T16:33:49.000Z',
      source: 'noe',
    },
  ],
  nextKey: {
    id: 'noe:3172657',
    timestamp: '2022-09-03T16:33:49.000Z',
    type: 'next',
  },
};
const newsMockUpdate = {
  stories: [
    {
      id: 'news:3284305',
      title: 'ÖFB-Spielerinnen hoffen auf größeres Stadion',
      category: 'Sport',
      url: 'https://orf.at/stories/3284305/',
      timestamp: '2022-09-07T19:06:29.000Z',
      source: 'news',
    },
  ],
  prevKey: {
    id: 'news:3284305',
    timestamp: '2022-09-07T19:06:29.000Z',
    type: 'prev',
  },
};
const newsMockEmptyUpdate = {
  stories: [],
  prevKey: null,
};
const newsMockWithFilter = {
  stories: [
    {
      id: 'news:3284304',
      title: 'Frankfurt geht bei CL-Debüt baden',
      category: 'Sport',
      url: 'https://orf.at/stories/3284304/',
      timestamp: '2022-09-07T18:47:35.000Z',
      source: 'news',
    },
    {
      id: 'news:3284302',
      title: 'OMV: „Kein einklagbares Fehlverhalten“ bei Ex-Chef Seele',
      category: 'Wirtschaft',
      url: 'https://orf.at/stories/3284302/',
      timestamp: '2022-09-07T17:57:19.000Z',
      source: 'news',
    },
  ],
  prevKey: {
    id: 'news:3284304',
    timestamp: '2022-09-07T18:47:35.000Z',
    type: 'prev',
  },
  nextKey: {
    id: 'news:3284302',
    timestamp: '2022-09-07T17:57:19.000Z',
    type: 'next',
  },
};
const newsMockNoContent = {
  stories: [],
  prevKey: null,
  nextKey: null,
};
const contentMockText =
  'Sporting Lissabon hat gestern das Debüt von Eintracht Frankfurt und Trainer Oliver Glasner in der UEFA Champions League verpatzt. Der portugiesische Vizemeister gewann beim regierenden Europa-League-Sieger durch Tore nach der Pause mit 3:0 (0:0). Im zweiten Spiel am frühen Abend fertigte Ajax Amsterdam die Glasgow Rangers 4:0 (3:0) ab.';
const contentMock = {
  content: `<div><p>${contentMockText}</p></div>`,
};

class NewsPage {
  constructor(page) {
    this.page = page;
    this.titleLink = page.locator('header > h1 > a');
    this.loadUpdateLink = page.locator("header nav a[title='Aktualisieren']");
    this.loadMoreButton = page.locator('main > div > button');
    this.newsFilter = page.locator('#news #news-filter');
    this.newsFilterMenuButton = this.newsFilter.locator('div + div > button');
    this.textFilterInput = this.newsFilter.locator('input');
    this.textFilterClearButton = this.newsFilter.locator('input + button');
    this.newsListItems = page.locator('#news ul > li');
    this.newsListSections = page.locator('#news section');
    this.newsNoContentInfo = page.locator('text=Keine News vorhanden');
    this.popover = page.locator('body > #headlessui-portal-root');
  }

  getDateFilterInput() {
    return this.popover.locator("input[type='date']");
  }

  getNewsListSection(index) {
    return this.newsListSections.nth(index);
  }

  getNewsListItem(index) {
    return this.newsListItems.nth(index);
  }

  getStoryContent(index) {
    return this.getNewsListItem(index).locator('article');
  }

  async mockSearchNewsApi(data, { filter, update } = {}) {
    await this.page.route('**/api/news/search**', (route) => {
      const url = new URL(route.request().url());
      const prevId = url.searchParams.get('prevId');
      if (prevId && !update) {
        route.fulfill({
          status: 200,
          body: JSON.stringify(newsMockEmptyUpdate),
        });
        return;
      }

      const filterParam = url.searchParams.get('textFilter');
      if ((!filter && !filterParam) || filter === filterParam) {
        route.fulfill({
          status: 200,
          body: JSON.stringify(data),
        });
      } else {
        route.continue();
      }
    });
  }

  async mockFetchContentApi(data) {
    await this.page.route('**/api/news/content**', (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    );
  }

  async visitSite() {
    const url = `${baseUrl}/`;
    const response = await this.page.goto(url);
    if (response.status() > 399) {
      throw new Error(`Failed with response code ${response.status()}`);
    }
  }

  async waitForContent() {
    return this.loadMoreButton.waitFor();
  }

  async waitForSearch() {
    await this.page.waitForResponse(/\/api\/news\/search/i);
  }

  async waitForStoryContent() {
    await this.page.waitForResponse(/\/api\/news\/content/i);
  }

  async searchNews(textFilter) {
    const search = this.waitForSearch();
    await this.textFilterInput.fill(textFilter);
    await search;
  }

  async searchNewsUpdates() {
    const search = this.waitForSearch();
    await this.loadUpdateLink.click();
    await search;
  }

  async searchMoreNews() {
    const search = this.waitForSearch();
    await this.loadMoreButton.click();
    await search;
  }

  async clearTextFilter() {
    const search = this.waitForSearch();
    await this.textFilterClearButton.click();
    await search;
  }

  async openStoryContent(index) {
    const request = this.waitForStoryContent();
    await this.toggleStoryContent(index);
    await request;
  }

  async toggleStoryContent(index) {
    const storyHeader = this.getNewsListItem(index).locator('header');
    await storyHeader.click();
  }
}

test.describe('NewsPage', () => {
  let log;

  test.beforeEach(async ({ page }) => {
    log = [];
    const logCall = (message) => log.push(message);
    await page.exposeFunction('logCall', logCall);
    await page.addInitScript(() => {
      // eslint-disable-next-line no-undef
      const navigator = window.navigator;

      navigator.canShare = (data) => {
        logCall(`canShare: ${data?.text}`);
        return true;
      };

      navigator.share = (data) => {
        logCall(`share: ${data?.text}`);
      };
    });
  });

  test.afterEach(async ({ page }) => {
    await cleanupPage(page);
  });

  test.describe('Site', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupPage(page, newsMock);
    });

    test('title', async () => {
      await expect(newsPage.titleLink).toHaveAttribute('href', '/');
      await expect(newsPage.titleLink).toHaveText('ORF Archiv');
    });
  });

  test.describe('Search', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupPage(page, newsMock);
    });

    test('search news', async () => {
      const expectedCount = newsMock.stories.length;
      await expect(newsPage.newsListItems).toHaveCount(expectedCount);
    });

    test('search news updates', async () => {
      await newsPage.mockSearchNewsApi(newsMockUpdate, { update: true });
      await newsPage.searchNewsUpdates();

      const expectedCount = newsMock.stories.length + newsMockUpdate.stories.length;
      await expect(newsPage.newsListItems).toHaveCount(expectedCount);
    });

    test('search more news', async () => {
      await newsPage.mockSearchNewsApi(newsMockMore);
      await newsPage.searchMoreNews();

      const expectedCount = newsMock.stories.length + newsMockMore.stories.length;
      await expect(newsPage.newsListItems).toHaveCount(expectedCount);
    });

    test('enter filter', async () => {
      await newsPage.mockSearchNewsApi(newsMockWithFilter, { filter: 'bei' });
      await newsPage.searchNews('bei');

      const expectedCount = newsMockWithFilter.stories.length;
      await expect(newsPage.newsListItems).toHaveCount(expectedCount);
    });

    test('enter filter without findings', async () => {
      await newsPage.mockSearchNewsApi(newsMockNoContent, { filter: 'suche ohne ergebnis' });
      await newsPage.searchNews('suche ohne ergebnis');

      await expect(newsPage.newsNoContentInfo).toBeVisible();
    });

    test('clear filter', async () => {
      await newsPage.mockSearchNewsApi(newsMockNoContent, 'suche ohne ergebnis');
      await newsPage.searchNews('suche ohne ergebnis');

      await newsPage.mockSearchNewsApi(newsMock);
      await newsPage.clearTextFilter();

      await expect(newsPage.textFilterInput).toHaveValue('');
      const expectedCount = newsMock.stories.length;
      await expect(newsPage.newsListItems).toHaveCount(expectedCount);
    });

    test('date filter is changeable', async () => {
      await newsPage.newsFilterMenuButton.click();
      await newsPage.getDateFilterInput().nth(0).isEditable();
      await newsPage.getDateFilterInput().nth(1).isEditable();
    });
  });

  test.describe('Sections', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupPage(page, newsMock);
    });

    test('Mittwoch, 07.09.2022', async () => {
      const sectionAktuell = newsPage.getNewsListSection(0);
      await expect(sectionAktuell.locator('h2')).toHaveText('Mittwoch, 07.09.2022');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });

    test('Dienstag, 06.09.2022', async () => {
      const sectionAktuell = newsPage.getNewsListSection(1);
      await expect(sectionAktuell.locator('h2')).toHaveText('Dienstag, 06.09.2022');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });

    test('Montag, 05.09.2022', async () => {
      const sectionAktuell = newsPage.getNewsListSection(2);
      await expect(sectionAktuell.locator('h2')).toHaveText('Montag, 05.09.2022');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });

    test('Sonntag, 04.09.2022', async () => {
      const sectionAktuell = newsPage.getNewsListSection(3);
      await expect(sectionAktuell.locator('h2')).toHaveText('Sonntag, 04.09.2022');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });

    test('Samstag, 03.09.2022', async () => {
      const sectionAktuell = newsPage.getNewsListSection(4);
      await expect(sectionAktuell.locator('h2')).toHaveText('Samstag, 03.09.2022');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });
  });

  test.describe('Story', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupPage(page, newsMock);
    });

    test('title', async () => {
      const storyIndex = 0;
      const storyTitle = newsPage.getNewsListItem(storyIndex).locator('header h3');
      const expectedStoryTitle = newsMock.stories[storyIndex].title;
      await expect(storyTitle).toHaveText(expectedStoryTitle);
    });

    test('info', async () => {
      const storyIndex = 1;
      const storyInfo = newsPage.getNewsListItem(storyIndex).locator('header h3 + span');

      const { category, timestamp } = newsMock.stories[storyIndex];
      const expectedStoryInfo = `${category} ${moment(timestamp).format('DD.MM.YYYY, HH:mm')}`;
      await expect(storyInfo).toHaveText(expectedStoryInfo);
    });
  });

  test.describe('Story options', () => {
    let newsPage;

    const storyIndex = 2;
    let storyMenu;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupPage(page, newsMock);

      storyMenu = newsPage.getNewsListItem(storyIndex).locator('button');
      await storyMenu.click();
    });

    test('article link', async () => {
      const articleLink = newsPage.popover.locator('a').nth(0);
      await articleLink.hover();
      await expect(articleLink).toBeVisible();

      const expectedHref = newsMock.stories[storyIndex].url;
      await expectExternalLink(articleLink, expectedHref);
    });

    test('bookmark button', async () => {
      const bookmarkButton = newsPage.popover.locator('button').nth(0);
      await bookmarkButton.hover();
      await expect(bookmarkButton).toBeVisible();
      await expect(bookmarkButton).toHaveText('Zu Lesezeichen hinzufügen');

      await bookmarkButton.click();
      await storyMenu.click();
      await expect(bookmarkButton).toHaveText('Von Lesezeichen entfernen');
    });

    test('share button', async () => {
      const shareButton = newsPage.popover.locator('button').nth(1);
      await shareButton.hover();
      await expect(shareButton).toBeVisible();

      await shareButton.click();

      const expectedClipboardText = newsMock.stories[storyIndex].url;
      await expect(log).toEqual([`canShare: ${expectedClipboardText}`, `share: ${expectedClipboardText}`]);
    });

    test('support link', async () => {
      const supportLink = newsPage.popover.locator('a').nth(1);
      await supportLink.hover();
      await expect(supportLink).toBeVisible();

      const expectedHref = 'https://der.orf.at/kontakt/orf-online-angebote100.html';
      await expectExternalLink(supportLink, expectedHref);
    });
  });

  test.describe('Content', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupPage(page, newsMock);
    });

    test('text', async () => {
      await newsPage.mockFetchContentApi(contentMock);

      const storyIndex = 0;
      await newsPage.openStoryContent(storyIndex);

      const storyContent = newsPage.getStoryContent(storyIndex);
      await expect(storyContent).toContainText(contentMockText);
    });

    test('is toggleable', async () => {
      await newsPage.mockFetchContentApi(contentMock);

      const storyIndex = 0;
      await newsPage.openStoryContent(storyIndex);

      const storyContent = newsPage.getStoryContent(storyIndex);
      await expect(storyContent).toBeVisible();

      await newsPage.toggleStoryContent(storyIndex);
      await expect(storyContent).not.toBeVisible();
    });
  });
});

async function setupPage(page, mock) {
  const newsPage = new NewsPage(page);
  await newsPage.mockSearchNewsApi(mock);
  await newsPage.visitSite();
  await newsPage.waitForContent();
  return newsPage;
}

async function cleanupPage(page) {
  await page.close();
}

async function expectExternalLink(locator, expectedHref) {
  await expect(locator).toHaveAttribute('href', expectedHref);
  await expect(locator).toHaveAttribute('target', '_blank');
}
