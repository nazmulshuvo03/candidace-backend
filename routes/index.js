const { Router } = require("express");
const userRoutes = require("./user");
const authRoutes = require("./auth");
const professionRoutes = require("./profession");
const skillRoutes = require("./skill");
const availabilityRoutes = require("./availability");
const meetingRoutes = require("./meeting");
const staticRoutes = require("./static");
const reviewRoutes = require("./review");
const messageRoutes = require("./message");
const notificationRoutes = require("./notification");
const blogRoutes = require("./blog");
const fileRoutes = require("./file");
const { requireAuth } = require("../middlewares/auth");
const { checkUser } = require("../middlewares/user");

const router = Router();

router.route("/").get((_req, res) => {
  res.json({
    message:
      "Hello from the Prep Meet backend. Last updated 14/03/2024 10:37 PM",
  });
});

router.use(checkUser);
router.use("/auth", authRoutes);
router.use("/file", fileRoutes);
router.use("/profession", professionRoutes);
router.use("/user", userRoutes);
router.use("/static", staticRoutes);
router.use("/skill", skillRoutes);
router.use("/notification", notificationRoutes);
router.use("/blog", blogRoutes);
router.use(requireAuth);
router.use("/availability", availabilityRoutes);
router.use("/meeting", meetingRoutes);
router.use("/review", reviewRoutes);
router.use("/message", messageRoutes);

module.exports = router;
