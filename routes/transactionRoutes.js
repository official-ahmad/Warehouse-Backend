const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");

// Create new transaction
router.post("/", transactionController.createTransaction);

// Get all transactions
router.get("/", transactionController.getAllTransactions);

// Get transactions by product ID
router.get("/:productId", transactionController.getTransactionsByProduct);

module.exports = router;
