const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", productController.addProduct);
router.post("/import", upload.single("file"), productController.importProducts);
router.post("/import/preview", upload.single("file"), productController.previewProducts);
router.post("/import/confirm", productController.confirmProducts);

router.get("/", productController.getAllProducts);

router.get("/history/deleted", productController.getProductHistory);

router.get("/:sku", productController.getProductBySKU);

router.put("/:id", productController.updateProduct);

router.delete("/:id", productController.deleteProduct);

module.exports = router;
