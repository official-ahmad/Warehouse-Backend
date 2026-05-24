const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// Add new product
router.post("/", productController.addProduct);

// Get all products
router.get("/", productController.getAllProducts);

// Get product by SKU
router.get("/:sku", productController.getProductBySKU);

module.exports = router;
