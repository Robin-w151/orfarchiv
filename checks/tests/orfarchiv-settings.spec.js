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
    return this.getListSection(sectionTitle).locator('li label', {
      has: this.page.locator(`text="${label}"`),
    });
  }

  async waitForSettingsStore() {
    return new Promise((resolve) => {
      this.page.on('console', (data) => {
        if (data.text() === 'settings-store-initialized') {
          resolve(data);
        }
      });
    });
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
  let settingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = await setupPage(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupPage(page);
  });

  test.describe('General', () => {
    const sectionTitle = 'Allgemein';

    test('fetch read more content', async () => {
      const checkbox = settingsPage.getListSectionInput(sectionTitle, 'Inhalt von weiterführendem Artikel laden');
      await expect(checkbox).not.toBeChecked();

      await checkbox.click();
      await settingsPage.visitSite();

      await expect(checkbox).toBeChecked();
    });
  });

  test.describe('Info', () => {
    const sectionTitle = 'Info';

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
    const sectionTitle = 'Darstellung';

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
    const sectionTitle = 'Quellen';
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

async function setupPage(page) {
  const settingsPage = new SettingsPage(page);
  await Promise.all([settingsPage.waitForSettingsStore(), settingsPage.visitSite()]);
  return settingsPage;
}

async function cleanupPage(page) {
  await page.close();
}
