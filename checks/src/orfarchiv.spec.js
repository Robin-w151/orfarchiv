const { chromium } = require("playwright")

const browser = await chromium.launch()
const page = await browser.newPage()

const targetUrl = process.env.ENVIRONMENT_URL || "https://orfarchiv.news"
const response = await page.goto(targetUrl)

if (response.status() > 399) {
  throw new Error(`Failed with response code ${response.status()}`)
}

await page.screenshot({ path: "screenshots/orfarchiv.jpg" })
await page.close()
await browser.close()