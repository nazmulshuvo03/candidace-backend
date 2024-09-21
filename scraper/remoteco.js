const axios = require("axios");
const cheerio = require("cheerio");
const { convertRelativeTimeToISO } = require("../helpers/timeDate"); // Updated import from utils folder

// Scraper function for Remote.co jobs
async function scrapeJobsFromRemoteCo() {
  const jobTypes = ["project-manager", "developer"];
  const url = "https://remote.co/remote-jobs/";

  try {
    const jobs = [];

    for (let jobName of jobTypes) {
      const { data } = await axios.get(`${url}${jobName}/`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      const $ = cheerio.load(data);

      // Select each job listing
      $("a.card").each((_index, element) => {
        // 1. Extract Job Title and clean it
        const jobTitle = $(element)
          .find(".font-weight-bold.larger")
          .text()
          .trim()
          .replace(/\n|\|/g, "")
          .replace(/\s+/g, " ");

        // 2. Extract Date Posted and convert to ISO 8601 format
        const datePostedText = $(element)
          .find(".float-right small date")
          .text()
          .trim();
        const datePosted = convertRelativeTimeToISO(datePostedText); // Use the utility function

        // 3. Extract Company Name and clean it
        const companyP = $(element).find("p.m-0.text-secondary").first();
        let companyName = companyP
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .trim()
          .replace(/\n|\|/g, "")
          .replace(/\s+/g, " ");

        // Ensure no trailing spaces or excessive whitespace
        companyName = companyName.replace(/\s+/g, " ").trim();

        const locationText = $(element)
          .find(".m-0.text-secondary span")
          .text()
          .trim();
        const location = locationText
          ? locationText.split(/,|\|/).map((loc) => loc.trim())
          : []; // Split by commas or symbols

        // 4. Extract Tags
        const tags = companyP
          .find("span.badge")
          .map((_i, el) => {
            return $(el).find("small").text().trim();
          })
          .get();

        // 5. Extract Apply URL
        const relativeURL = $(element).attr("href").trim();
        const applyUrl = `https://remote.co${relativeURL}`;

        // 6. Extract Image URL from the lazy-loaded img tag (data-lazy-src)
        const imageDiv = $(element).find(
          "div.col-lg-1.col-md-2.position-static.d-none.d-md-block.pr-md-3",
        );
        let imageUrl = imageDiv.find("img").attr("data-lazy-src"); // Use data-lazy-src to get the actual image URL

        // If data-lazy-src is not available, fallback to regular src
        if (!imageUrl) {
          imageUrl = imageDiv.find("img").attr("src");
        }

        // Skip data:image/svg+xml or placeholders
        if (imageUrl && imageUrl.startsWith("data:image")) {
          imageUrl = null;
        }

        // 7. Push the job to the jobs array if essential fields are present
        if (jobTitle && companyName) {
          jobs.push({
            source: "Remote.co",
            jobTitle,
            companyName,
            location,
            datePosted,
            applyUrl,
            imageUrl: imageUrl || null,
            tags,
          });
        }
      });
    }
    console.log(`Found ${jobs.length} job listings`);
    return jobs;
  } catch (error) {
    console.error(`Error while scraping Remote.co: ${error.message}`);
    return [];
  }
}

module.exports = scrapeJobsFromRemoteCo;
