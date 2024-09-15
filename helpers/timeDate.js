const moment = require("moment"); // Import moment.js for date formatting

/**
 * Eg:
 * originalDate = 1706637600000
 * hour = 14
 */
const convertToUnixDateTime = (originalDate, hour) => {
  if (!originalDate || originalDate === new Date()) {
    let current = new Date();
    originalDate = current.setHours(0, 0, 0, 0);
  }
  dateWithOriginalTime = new Date(originalDate);
  dateWithOriginalTime.setHours(hour, 0, 0, 0);
  const updatedTime = dateWithOriginalTime.getTime();
  return updatedTime;
};

const getTimezoneOffset = (timezone) => {
  const timezoneDate = new Date();
  const utcDate = timezoneDate.toUTCString();
  const timezoneOffset = new Date(utcDate).toLocaleString("en-US", {
    timeZone: timezone,
  });
  const timezoneOffsetDate = new Date(timezoneOffset);
  return (timezoneOffsetDate - timezoneDate) / (60 * 1000);
};

const getDateOfIndexDay = (dayIndex, hour, timezone) => {
  const currentDate = new Date();

  // Calculate the current day index (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
  let currentDayIndex = currentDate.getDay();

  // Adjust the current day index to match the provided dayIndex
  currentDayIndex = currentDayIndex === 0 ? 7 : currentDayIndex; // If Sunday, set it to 7
  const daysUntilDay = (dayIndex - currentDayIndex + 7) % 7;

  // Calculate the date of the requested day
  const dayDate = new Date(currentDate);
  dayDate.setDate(currentDate.getDate() + daysUntilDay);

  // Get the timezone offset in minutes
  const timezoneOffset = getTimezoneOffset(timezone);

  // Adjust the hour according to the timezone offset
  dayDate.setHours(hour - timezoneOffset / 60, 0, 0, 0);

  return dayDate;
};

/**
 * Converts relative time formats (e.g., "2 days ago", "3 weeks ago", "5 hours ago", "4 months ago", "3 d", "30 d")
 * into ISO 8601 date format (YYYY-MM-DDTHH:mm:ssZ) without milliseconds.
 *
 * Supported relative time formats:
 * - X hours ago
 * - X days ago
 * - X weeks ago
 * - X months ago
 * - X years ago
 * - Xh, Xd, Xw, Xmo, Xy (for shortened forms like "3 d", "2 h", etc.)
 *
 * @param {string} dateText - The relative time text (e.g., "2 days ago", "5 months ago", "3 d").
 * @returns {string|null} - ISO 8601 date string without milliseconds or null if the format is unrecognized.
 */
function convertRelativeTimeToISO(dateText) {
  if (!dateText) return null;

  const now = moment(); // Current date and time
  let isoDate = null;

  // Regular expression to match both formats: "2 days ago", "3 d", "1 month ago", etc.
  const timeMatch = dateText.match(/(\d+)\s*(\w+)/);
  if (timeMatch) {
    const amount = parseInt(timeMatch[1], 10);
    const unit = timeMatch[2].toLowerCase();

    // Determine the time unit and subtract the appropriate amount from the current date
    switch (unit) {
      case "h":
      case "hour":
      case "hours":
        isoDate = now.subtract(amount, "hours").toISOString();
        break;
      case "d":
      case "day":
      case "days":
        isoDate = now.subtract(amount, "days").toISOString();
        break;
      case "w":
      case "week":
      case "weeks":
        isoDate = now.subtract(amount, "weeks").toISOString();
        break;
      case "mo":
      case "month":
      case "months":
        isoDate = now.subtract(amount, "months").toISOString();
        break;
      case "y":
      case "year":
      case "years":
        isoDate = now.subtract(amount, "years").toISOString();
        break;
      default:
        isoDate = null; // Fallback if the time unit is not recognized
    }
  }

  // Remove milliseconds for consistency with RemoteOK format
  if (isoDate) {
    isoDate = moment(isoDate).format("YYYY-MM-DDTHH:mm:ssZ"); // Format to exclude milliseconds
  }

  return isoDate;
}

module.exports = {
  convertToUnixDateTime,
  getDateOfIndexDay,
  convertRelativeTimeToISO,
};
