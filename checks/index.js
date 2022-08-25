const { test, expect } = require("@playwright/test")

class NewsPage {
  constructor(page) {
    this.page = page
    this.screenshotCount = 1
    this.loadUpdateLink = page.locator("header a[title='Nach Updates suchen']")
    this.loadMoreButton = page.locator("main > div > button")
    this.searchInput = page.locator("main input")
    this.newsListItems = page.locator("main ul > li")
    this.newsNoContentInfo = page.locator("text=Keine News vorhanden")
  }

  async takeScreenshot() {
    await this.page.screenshot({ path: `screenshot-${this.screenshotCount++}.jpg` })
  }

  waitForContent() {
    return this.loadMoreButton.waitFor()
  }

  async waitForSearch() {
    await this.page.waitForResponse(/news\/search/i)
  }

  async searchNewsUpdates() {
    await this.loadUpdateLink.click()
    await this.waitForSearch()
  }

  async searchNews(textFilter) {
    await this.searchInput.fill(textFilter)
    await this.waitForSearch()
  }
}

test('NewsPage', async ({ page }) => {
  const response = await page.goto("https://orfarchiv.news")
  if (response.status() > 399) {
    throw new Error(`Failed with response code ${response.status()}`)
  }

  const newsPage = new NewsPage(page)
  await newsPage.waitForContent()
  await expect(newsPage.newsListItems).toHaveCount(100)
  await newsPage.takeScreenshot()

  await newsPage.searchNews("news")
  await expect(newsPage.newsListItems).toHaveCount(100)
  await newsPage.takeScreenshot()

  await newsPage.searchNewsUpdates()
  await expect(newsPage.newsListItems).toHaveCount(100)
  await newsPage.takeScreenshot()

  await newsPage.searchNews("aklsdjfklasdjfklasdjlkf")
  await expect(newsPage.newsNoContentInfo).toBeVisible()
  await newsPage.takeScreenshot()

  await page.close()
});
