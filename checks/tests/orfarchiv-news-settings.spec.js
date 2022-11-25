const { test, expect } = require('@playwright/test');

const baseUrl = process.env.ENVIRONMENT_URL || process.env.ORFARCHIV_BASE_URL || 'https://orfarchiv.news';

class SettingsPage {
  constructor(page) {
    this.page = page;
  }

  getListSection(sectionTitle) {
    return this.page
      .locator('main section', { has: this.page.locator(`header > h2:text-is("${sectionTitle}")`) })
      .locator('ul');
  }

  getListSectionItem(sectionTitle, index) {
    return this.getListSection(sectionTitle).locator('li').nth(index);
  }

  getListSectionInput(sectionTitle, label) {
    return this.getListSection(sectionTitle)
      .locator('li', { has: this.page.locator(`label:text-is("${label}")`) })
      .locator('input');
  }

  async visitSite() {
    const url = `${baseUrl}/settings`;
    const response = await this.page.goto(url);
    if (response.status() > 399) {
      throw new Error(`Failed with response code ${response.status()}`);
    }
  }
}

test.describe('SettingsPage', () => {
  test.afterEach(async ({ page }, testInfo) => {
    await cleanupPage(page, testInfo);
  });

  test.afterAll(async ({ browser }) => {
    await browser.close();
  });

  test.describe('General', () => {
    let settingsPage;
    let sectionTitle = 'Allgemein';

    test.beforeEach(async ({ page }) => {
      settingsPage = await setupPage(page);
    });

    test('open links in new tab', async () => {
      const checkbox = settingsPage.getListSectionInput(sectionTitle, 'Links in neuem Tab öffnen');
      await expect(checkbox).toBeChecked();

      await checkbox.click();
      await settingsPage.visitSite();

      await expect(checkbox).not.toBeChecked();
    });
  });

  test.describe('Info', () => {
    let settingsPage;
    let sectionTitle = 'Info';

    test.beforeEach(async ({ page }) => {
      settingsPage = await setupPage(page);
    });

    test('version', async () => {
      const version = settingsPage.getListSectionItem(sectionTitle, 0);
      await expect(version).toContainText('Version');
    });

    test('source code', async () => {
      const sourceCode = settingsPage.getListSectionItem(sectionTitle, 1);
      await expect(sourceCode).toContainText('Quellcode auf GitHub');
    });

    test('powered by', async () => {
      const poweredBy = settingsPage.getListSectionItem(sectionTitle, 2);
      await expect(poweredBy).toContainText('Powered by SvelteKit');
    });

    test('hosted on', async () => {
      const hostedOn = settingsPage.getListSectionItem(sectionTitle, 3);
      await expect(hostedOn).toContainText('Gehostet bei Vercel');
    });
  });

  test.describe('Appearance', () => {
    let settingsPage;
    let sectionTitle = 'Darstellung';

    test.beforeEach(async ({ page }) => {
      settingsPage = await setupPage(page);
    });

    test('system', async () => {
      const radioButton = settingsPage.getListSectionInput(sectionTitle, 'Automatisch');
      await expect(radioButton).toBeChecked();
    });

    test('light', async () => {
      const radioButton = settingsPage.getListSectionInput(sectionTitle, 'Hell');
      await expect(radioButton).not.toBeChecked();

      await radioButton.click();
      await settingsPage.visitSite();

      await expect(radioButton).toBeChecked();
      await expect(settingsPage.page.locator('html')).not.toHaveClass('dark');
    });

    test('dark', async () => {
      const radioButton = settingsPage.getListSectionInput(sectionTitle, 'Dunkel');
      await expect(radioButton).not.toBeChecked();

      await radioButton.click();
      await settingsPage.visitSite();

      await expect(radioButton).toBeChecked();
      await expect(settingsPage.page.locator('html')).toHaveClass('dark');
    });
  });

  test.describe('Source', () => {
    const sources = [
      'News',
      'Sport',
      'Help',
      'Science',
      'Religion',
      'Ö3',
      'FM4',
      'Österreich',
      'Burgenland',
      'Wien',
      'Niederösterreich',
      'Oberösterreich',
      'Salzburg',
      'Steiermark',
      'Kärnten',
      'Tirol',
      'Vorarlberg',
    ];
    let settingsPage;
    let sectionTitle = 'Quellen';

    test.beforeEach(async ({ page }) => {
      settingsPage = await setupPage(page);
    });

    for (const source of sources) {
      test(source, async () => {
        const checkbox = settingsPage.getListSectionInput(sectionTitle, source);
        await expect(checkbox).toBeChecked();

        await checkbox.click();
        await settingsPage.visitSite();

        await expect(checkbox).not.toBeChecked();
      });
    }
  });
});

async function setupPage(page, mock) {
  const settingsPage = new SettingsPage(page);
  await settingsPage.visitSite();
  return settingsPage;
}

async function cleanupPage(page) {
  await page.close();
}
