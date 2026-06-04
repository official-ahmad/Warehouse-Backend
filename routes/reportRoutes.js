const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const auth = require("../middleware/auth");
const adminCheck = require("../middleware/adminCheck");

router.use(auth);
router.use(adminCheck);

router.get("/low-stock", reportController.getLowStockReport);
router.get("/top-products", reportController.getTopProductsReport);
router.get("/daily-summary", reportController.getDailySummary);

module.exports = router;
