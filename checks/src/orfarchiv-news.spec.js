const { test, expect } = require('@playwright/test');
const moment = require('moment');
const { join } = require('path');

const baseUrl = process.env.ORFARCHIV_BASE_URL || 'https://orfarchiv.news';
const screenshotsPath = process.env.SCREENSHOTS_PATH ?? '.';

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
      timestamp: '2022-09-07T18:20:50.000Z',
      source: 'news',
    },
    {
      id: 'news:3284215',
      title: 'Die Abrechnung des John Malkovich',
      category: 'Kultur',
      url: 'https://orf.at/stories/3284215/',
      timestamp: '2022-09-07T18:06:00.000Z',
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
    {
      id: 'news:3284301',
      title: 'Bolsonaro nutzt Unabhängigkeitstag für Wahlkampf',
      category: 'Ausland',
      url: 'https://orf.at/stories/3284301/',
      timestamp: '2022-09-07T17:37:36.000Z',
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
    timestamp: '2022-09-07T17:37:36.000Z',
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
const contentMock = `<div><p>${contentMockText}</p></div>`;

class NewsPage {
  constructor(page) {
    this.page = page;
    this.loadUpdateLink = page.locator("header a[title='Nach Updates suchen']");
    this.loadMoreButton = page.locator('main > div > button');
    this.searchInput = page.locator('main input');
    this.newsListItems = page.locator('main ul > li');
    this.newsListSections = page.locator('main section');
    this.newsNoContentInfo = page.locator('text=Keine News vorhanden');
    this.popover = page.locator('body > div#headlessui-portal-root');
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

  async mockSearchNewsApi(data, filter) {
    await this.page.route('**/api/news/search**', (route) => {
      const url = new URL(route.request().url());
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
          'Content-Type': 'text/plain',
        },
        body: data,
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
    await this.searchInput.fill(textFilter);
    await search;
  }

  async searchNewsUpdates() {
    const search = this.waitForSearch();
    await this.loadUpdateLink.click();
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
  test.afterEach(async ({ page }, testInfo) => {
    await cleanupNewsPage(page, testInfo);
  });

  test.describe('Search', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupNewsPage(page, newsMock);
    });

    test('fetch news', async () => {
      await expect(newsPage.newsListItems).toHaveCount(5);
    });

    test('fetch news updates', async () => {
      await newsPage.mockSearchNewsApi(newsMockUpdate);
      await newsPage.searchNewsUpdates();
      await expect(newsPage.newsListItems).toHaveCount(6);
    });

    test('enter filter', async () => {
      await newsPage.mockSearchNewsApi(newsMockWithFilter, 'bei');
      await newsPage.searchNews('bei');
      await expect(newsPage.newsListItems).toHaveCount(2);
    });

    test('enter filter without findings', async () => {
      await newsPage.mockSearchNewsApi(newsMockNoContent, 'suche ohne ergebnis');
      await newsPage.searchNews('suche ohne ergebnis');
      await expect(newsPage.newsNoContentInfo).toBeVisible();
    });
  });

  test.describe('Sections', () => {
    let newsPage;
    let newsMockWithAdjustedTimestamps;

    test.beforeAll(() => {
      newsMockWithAdjustedTimestamps = deepCopy(newsMock);
      const [s1, s2, s3, s4, s5] = newsMockWithAdjustedTimestamps.stories;

      s1.timestamp = nowMinusHours(0);
      s2.timestamp = nowMinusHours(1);
      s3.timestamp = nowMinusHours(2);
      s4.timestamp = nowMinusHours(24);
      s5.timestamp = nowMinusHours(48);
    });

    test.beforeEach(async ({ page }) => {
      newsPage = await setupNewsPage(page, newsMockWithAdjustedTimestamps);
    });

    test('Aktuell', async () => {
      const sectionAktuell = newsPage.getNewsListSection(0);
      await expect(sectionAktuell.locator('h2')).toHaveText('Aktuell');
      await expect(sectionAktuell.locator('li')).toHaveCount(2);
    });

    test('Letzte 24h', async () => {
      const sectionAktuell = newsPage.getNewsListSection(1);
      await expect(sectionAktuell.locator('h2')).toHaveText('Letzte 24h');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });

    test('Letzte 48h', async () => {
      const sectionAktuell = newsPage.getNewsListSection(2);
      await expect(sectionAktuell.locator('h2')).toHaveText('Letzte 48h');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });

    test('Letzte 7 Tage', async () => {
      const sectionAktuell = newsPage.getNewsListSection(3);
      await expect(sectionAktuell.locator('h2')).toHaveText('Letzte 7 Tage');
      await expect(sectionAktuell.locator('li')).toHaveCount(1);
    });
  });

  test.describe('Stories', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupNewsPage(page, newsMock);
    });

    test('title', async () => {
      const storyIndex = 0;
      const storyTitle = newsPage.getNewsListItem(storyIndex).locator('header > h3');
      const expectedStoryTitle = newsMock.stories[storyIndex].title;
      await expect(storyTitle).toHaveText(expectedStoryTitle);
    });

    test('info', async () => {
      const storyIndex = 1;
      const storyInfo = newsPage.getNewsListItem(storyIndex).locator('header > span');

      const { category, timestamp } = newsMock.stories[storyIndex];
      const expectedStoryInfo = `${category} - ${moment(timestamp).format('DD.MM.YYYY, HH:mm')}`;
      await expect(storyInfo).toHaveText(expectedStoryInfo);
    });

    test('article link', async () => {
      const storyIndex = 2;
      const storyMenu = newsPage.getNewsListItem(storyIndex).locator('button');
      await storyMenu.click();

      const articleLink = newsPage.popover.locator('a');
      await articleLink.hover();
      await expect(articleLink).toBeVisible();

      const expectedHref = newsMock.stories[storyIndex].url;
      await expect(articleLink).toHaveAttribute('href', expectedHref);
    });

    test('share button', async () => {
      const storyIndex = 3;
      const storyMenu = newsPage.getNewsListItem(storyIndex).locator('button');
      await storyMenu.click();

      const shareButton = newsPage.popover.locator('button');
      await shareButton.hover();
      await expect(shareButton).toBeVisible();
    });
  });

  test.describe('Content', () => {
    let newsPage;

    test.beforeEach(async ({ page }) => {
      newsPage = await setupNewsPage(page, newsMock);
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

function deepCopy(object) {
  return JSON.parse(JSON.stringify(object));
}

function nowMinusHours(hours) {
  return moment().subtract(hours, 'hours').toISOString(false);
}

async function setupNewsPage(page, mock) {
  const newsPage = new NewsPage(page);
  await newsPage.mockSearchNewsApi(mock);
  await newsPage.visitSite();
  await newsPage.waitForContent();
  return newsPage;
}

async function cleanupNewsPage(page, testInfo) {
  if (testInfo.status === 'failed') {
    const path = screenshotPath(testInfo);
    await page.screenshot({ path });
  }
  await page.close();
}

function screenshotPath(testInfo) {
  const [_, ...paths] = testInfo.titlePath;
  const path = paths.join('-').replace(/\s/g, '-') + '.png';
  return join(screenshotsPath, path);
}
