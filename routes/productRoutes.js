const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.post("/", productController.addProduct);

router.get("/", productController.getAllProducts);

router.get("/history/deleted", productController.getProductHistory);

router.get("/:sku", productController.getProductBySKU);

router.put("/:id", productController.updateProduct);

router.delete("/:id", productController.deleteProduct);

module.exports = router;
