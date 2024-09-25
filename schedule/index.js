const schedule = require("node-schedule");
const {
  generateAvailabilityFromRecurrent,
} = require("../controllers/availability");
const {
  sendAllUserProfileCompletionReminder,
  sendAllUserReactivationReminder,
} = require("../controllers/scheduleEmails");
const { _refreshJobBoardData } = require("../controllers/jobBoard");

/**
  0 for minute (0th minute)
  23 for hour (11th hour, which is 11 PM)
  * for day of the month (every day)
  * for month (every month)
  0 for day of the week (Sunday)
 */
schedule.scheduleJob("0 23 * * 0", () => {
  generateAvailabilityFromRecurrent();
});

// schedule.scheduleJob("0 18 * * *", () => {
//   sendAllUserProfileCompletionReminder();
// });

// schedule.scheduleJob("0 23 * * 0", () => {
//   sendAllUserReactivationReminder();
// });

// schedule.scheduleJob("* * * * *", () =>
//   console.log("Schedule run ", new Date())
// );

schedule.scheduleJob("0 0 * * *", () => {
  _refreshJobBoardData();
});

module.exports = schedule;
