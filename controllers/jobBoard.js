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

const getAllJobs = asyncWrapper(async (_req, res) => {
  const data = await JobBoard.findAll();
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

const scrapeAndPost = asyncWrapper(async (req, res) => {
  const remoteOKJobs = await scrapeJobsFromRemoteOK();
  const weWorkRemotelyJobs = await scrapeJobsFromWeWorkRemotely();
  const remoteCoJobs = await scrapeJobsFromRemoteCo();

  let allJobs = [];

  // Combine jobs, ensuring no duplicates
  [remoteOKJobs, weWorkRemotelyJobs, remoteCoJobs].forEach((jobArray) => {
    jobArray.forEach((job) => {
      if (!_isDuplicate(allJobs, job)) {
        allJobs.push(job);
      }
    });
  });
  res.success(allJobs);
});

module.exports = {
  getAllJobs,
  createJobData,
  deleteJobData,
  scrapeAndPost,
};
