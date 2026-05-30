const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminCheck");

router.post("/register", authMiddleware, adminMiddleware, authController.register);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
