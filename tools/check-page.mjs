import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  const text = await page.locator("#root").innerText();
  console.log("TEXT:", text.slice(0, 400));
  console.log("ERRS:", errs.join("; ") || "none");
  await browser.close();
})();
