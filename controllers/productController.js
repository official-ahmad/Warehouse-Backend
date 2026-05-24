const Product = require("../models/Product");


exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      SKU,
      category,
      quantity,
      price,
      lowStockThreshold,
    } = req.body;

    const product = new Product({
      name,
      description,
      SKU,
      category,
      quantity,
      price,
      lowStockThreshold,
    });

    await product.save();
    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();

    const productsWithStockStatus = products.map((product) => ({
      ...product.toObject(),
      isLowStock: product.quantity < product.lowStockThreshold,
    }));

    res.status(200).json(productsWithStockStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getProductBySKU = async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ SKU: sku });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const productWithStatus = {
      ...product.toObject(),
      isLowStock: product.quantity < product.lowStockThreshold,
    };

    res.status(200).json(productWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
