const axios = require("axios");
const cheerio = require("cheerio");
const { convertRelativeTimeToISO } = require("../helpers/timeDate"); // Import your date utility

// Scraper function for WeWorkRemotely jobs using Axios and Cheerio
async function scrapeJobsFromWeWorkRemotely() {
  const url = "https://weworkremotely.com/remote-jobs";

  try {
    // Make a request with browser-like headers to avoid being blocked
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://google.com", // Mimic coming from Google search
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        Connection: "keep-alive",
        DNT: "1", // Do Not Track header to simulate real traffic
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const $ = cheerio.load(data);
    const jobs = [];

    // Parse job listings
    $(".jobs ul li").each((_index, element) => {
      const jobTitle = $(element).find("span.title").text().trim();
      const companyName = $(element).find("span.company").text().trim();

      const locationText = $(element).find("span.region").text().trim();
      const location = locationText
        ? locationText.split("/").map((loc) => loc.trim())
        : [];

      const applyUrl =
        "https://weworkremotely.com" + $(element).find("a").attr("href");

      const datePostedText = $(element)
        .find(".listing-date__date")
        .text()
        .trim();

      const datePosted = convertRelativeTimeToISO(datePostedText); // Convert relative time to ISO format

      // Extract image URL from background-image in the div with class 'flag-logo'
      let imageUrl = null;
      const backgroundImageStyle = $(element)
        .find(".flag-logo")
        .css("background-image");
      if (backgroundImageStyle) {
        // Extract the URL from the background-image CSS property
        const matches = backgroundImageStyle.match(
          /url\(["']?([^"')]+)["']?\)/,
        );
        if (matches && matches[1]) {
          imageUrl = matches[1]; // The actual image URL
        }
      }

      // Extract relative date (e.g., "11d" for 11 days ago) and convert to ISO format
      const tags = [];
      $(element)
        .find(".tags li")
        .each((_i, tagElem) => {
          tags.push($(tagElem).text().trim());
        });

      if (jobTitle && companyName) {
        jobs.push({
          source: "WeWorkRemotely",
          jobTitle,
          companyName,
          location,
          datePosted, // Use converted date
          applyUrl,
          imageUrl, // No images on WeWorkRemotely
          tags,
        });
      }
    });

    return jobs;
  } catch (error) {
    console.error(`Error while scraping WeWorkRemotely: ${error}`);
    return [];
  }
}

module.exports = scrapeJobsFromWeWorkRemotely;
