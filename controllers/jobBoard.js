const { Sequelize } = require("sequelize");
const asyncWrapper = require("../middlewares/async");
const { JobBoard } = require("../models/jobBoard");
const { BAD_REQUEST } = require("../constants/errorCodes");
const scrapeJobsFromRemoteOK = require("../scraper/remoteok");
const scrapeJobsFromWeWorkRemotely = require("../scraper/weworkremotely");
const scrapeJobsFromRemoteCo = require("../scraper/remoteco");

// Utility function to check if the job is a duplicate
function _isDuplicate(jobs, newJob) {
  return jobs.some(
    (job) =>
      job.jobTitle === newJob.jobTitle &&
      job.companyName === newJob.companyName,
  );
}

async function _searchOrCreate(data) {
  const startOfDay = new Date(data.datePosted);
  startOfDay.setUTCHours(0, 0, 0, 0); // Set time to start of the day (00:00:00)

  const endOfDay = new Date(data.datePosted);
  endOfDay.setUTCHours(23, 59, 59, 999); // Set time to end of the day (23:59:59)

  const found = await JobBoard.findOne({
    where: {
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      datePosted: {
        [Sequelize.Op.between]: [startOfDay, endOfDay],
      },
    },
  });
  if (!found) {
    await JobBoard.create(data);
  }
  return found;
}

const getAllJobs = asyncWrapper(async (req, res) => {
  const { searchTerm, page = 1, limit = 10 } = req.query;

  let filters = {};

  // Apply searchTerm to both jobTitle and companyName fields
  if (searchTerm) {
    filters = {
      [Sequelize.Op.or]: [
        { jobTitle: { [Sequelize.Op.iLike]: `%${searchTerm}%` } }, // case-insensitive search in jobTitle
        { companyName: { [Sequelize.Op.iLike]: `%${searchTerm}%` } }, // case-insensitive search in companyName
      ],
    };
  }

  // Pagination logic
  const offset = (page - 1) * limit;

  const data = await JobBoard.findAll({
    where: filters,
    order: [["datePosted", "DESC"]],
    limit: parseInt(limit, 10), // Limit the number of results per page
    offset: parseInt(offset, 10), // Skip results based on the current page
  });

  res.success(data);
});

const createJobData = asyncWrapper(async (req, res) => {
  const model = req.body;
  const created = await JobBoard.create(model);
  if (!created) return res.fail("Job data could not be created", BAD_REQUEST);
  res.success(created);
});

const deleteJobData = asyncWrapper(async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) return res.fail("Invalid Job ID", BAD_REQUEST);
  await JobBoard.destroy({ where: { id: jobId } });
  res.success("Deleted");
});

const scrapeAndPost = asyncWrapper(async (_req, res) => {
  const remoteOKJobs = await scrapeJobsFromRemoteOK();
  const weWorkRemotelyJobs = await scrapeJobsFromWeWorkRemotely();
  const remoteCoJobs = await scrapeJobsFromRemoteCo();

  const dataLength = {
    remoteOk: remoteOKJobs.length,
    weWorkRemotely: weWorkRemotelyJobs.length,
    remoteCo: remoteCoJobs.length,
    total:
      remoteOKJobs.length + weWorkRemotelyJobs.length + remoteCoJobs.length,
  };

  // let allJobs = [];

  // Combine jobs, ensuring no duplicates
  [remoteOKJobs, weWorkRemotelyJobs, remoteCoJobs].forEach((jobArray) => {
    jobArray.forEach((job) => {
      // if (!_isDuplicate(allJobs, job)) {
      //   allJobs.push(job);
      // }
      _searchOrCreate(job);
    });
  });
  res.success(dataLength);
});

module.exports = {
  getAllJobs,
  createJobData,
  deleteJobData,
  scrapeAndPost,
};
