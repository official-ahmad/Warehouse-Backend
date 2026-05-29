const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activityLogController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminCheck");

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  activityLogController.getActivityLogs,
);
router.get(
  "/user/:userId",
  authMiddleware,
  adminMiddleware,
  activityLogController.getUserActivityLogs,
);
router.get(
  "/export",
  authMiddleware,
  adminMiddleware,
  activityLogController.getActivityLogsExport,
);

module.exports = router;
