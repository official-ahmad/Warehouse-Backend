const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminCheck");

router.get("/", authMiddleware, adminMiddleware, userController.getAllUsers);
router.get("/:id", authMiddleware, adminMiddleware, userController.getUserById);
router.post("/", authMiddleware, adminMiddleware, userController.createUser);
router.put("/:id", authMiddleware, adminMiddleware, userController.updateUser);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  userController.deactivateUser,
);

module.exports = router;
