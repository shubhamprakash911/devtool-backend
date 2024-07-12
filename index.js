const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const app = express();

app.use(cors());

// health check endpoint
app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/devtool", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send("Please provide a URL");
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: puppeteer.executablePath(), // Ensure Puppeteer uses the installed Chromium
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const networkData = {
      html: "",
      css: [],
      js: [],
      xhr: [],
      images: [],
      docs: [],
    };

    page.on("request", (request) => {
      const type = request.resourceType();
      const requestUrl = request.url();

      if (type === "stylesheet") {
        networkData.css.push(requestUrl);
      } else if (type === "script") {
        networkData.js.push(requestUrl);
      } else if (type === "xhr") {
        networkData.xhr.push(requestUrl);
      } else if (type === "image") {
        networkData.images.push(requestUrl);
      } else if (type === "document") {
        networkData.docs.push(requestUrl);
      }
    });

    await page.goto(url, { waitUntil: "networkidle2" });
    networkData.html = await page.content();
    await browser.close();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(networkData);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).send("Error while scraping the page");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
