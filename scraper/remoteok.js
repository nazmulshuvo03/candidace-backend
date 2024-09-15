const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment"); // Import moment.js for date formatting

// Scraper function for RemoteOK jobs
async function scrapeJobsFromRemoteOK() {
  const url = "https://remoteok.com/";

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(data);
    const jobs = [];

    $("#jobsboard .job").each((_index, element) => {
      // 1. Extract Job Title
      const jobTitle = $(element)
        .find('.company_and_position [itemprop="title"]')
        .text()
        .trim();

      // 2. Extract Company Name
      const companyName = $(element).find(".companyLink h3").text().trim();

      // 3. Extract and Format Location
      const location = [];
      $(element)
        .find(".location")
        .each((_i, locElem) => {
          location.push($(locElem).text().trim());
        });

      // 4. Extract and Format Date Posted
      let datePosted = $(element).find("time").attr("datetime");
      if (datePosted) {
        // Use moment.js to format the date to exclude milliseconds
        datePosted = moment(datePosted).format("YYYY-MM-DDTHH:mm:ssZ");
      }

      // 5. Extract Apply URL
      const applyUrl =
        "https://remoteok.com" + $(element).find("a.preventLink").attr("href");

      // 6. Extract Image URL
      let imageUrl =
        $(element).find("img.logo").attr("data-src") ||
        $(element).find("img.logo").attr("src");

      // Handle relative URLs
      if (imageUrl) {
        imageUrl = imageUrl.startsWith("https")
          ? imageUrl
          : "https://remoteok.com" + imageUrl;
      }

      // 7. Extract Tags
      const tags = [];
      $(element)
        .find(".tags .tag")
        .each((_i, tagElem) => {
          tags.push($(tagElem).text().trim());
        });

      // 8. Push Job to Jobs Array if Title and Company Name are available
      if (jobTitle && companyName) {
        jobs.push({
          source: "RemoteOK",
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

    return jobs;
  } catch (error) {
    console.error(`Error while scraping RemoteOK: ${error.message}`);
    return [];
  }
}

module.exports = scrapeJobsFromRemoteOK;
