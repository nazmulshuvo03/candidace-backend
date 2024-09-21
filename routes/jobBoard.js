const { Router } = require("express");
const {
  getAllJobs,
  deleteJobData,
  createJobData,
  scrapeAndPost,
} = require("../controllers/jobBoard");
const router = Router();

router.route("/:jobId").delete(deleteJobData);
router.route("/").get(getAllJobs).post(createJobData);
router.route("/scrape").get(scrapeAndPost);

module.exports = router;
