const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const ActivityLog = require("../models/ActivityLog");

exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      SKU,
      category,
      quantity,
      price,
      costPrice,
      lowStockThreshold,
      reorderQuantity,
      expiryDate,
    } = req.body;

    if (price !== undefined && price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }
    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    const product = new Product({
      name,
      description,
      SKU,
      category,
      quantity,
      price,
      costPrice,
      lowStockThreshold,
      reorderQuantity,
      expiryDate,
    });

    await product.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product._id,
      changes: { name, SKU, category, quantity, price },
    });

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ deletedAt: null });

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

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await ActivityLog.create({
      userId: req.user.id,
      action: "PRODUCT_DELETED",
      entityType: "Product",
      entityId: product._id,
      changes: { name: product.name, SKU: product.SKU },
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.price !== undefined && updates.price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }
    if (updates.quantity !== undefined && updates.quantity < 0) {
      return res.status(400).json({ error: "Quantity cannot be negative" });
    }

    const product = await Product.findById(id);
    if (!product || product.deletedAt) {
      return res.status(404).json({ error: "Product not found" });
    }

    const changes = {};
    const allowedFields = [
      "name", "description", "SKU", "category", "quantity",
      "price", "costPrice", "lowStockThreshold", "reorderQuantity", "expiryDate",
    ];

    allowedFields.forEach((key) => {
      if (updates[key] !== undefined && String(product[key]) !== String(updates[key])) {
        changes[key] = { from: product[key], to: updates[key] };
        product[key] = updates[key];
      }
    });

    await product.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: product._id,
      changes,
    });

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "SKU already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};


exports.getProductHistory = async (req, res) => {
  try {
    const deletedProducts = await Product.find({ deletedAt: { $ne: null } });

    const history = await Promise.all(
      deletedProducts.map(async (product) => {
        const transactions = await Transaction.find({
          productId: product._id,
        });

        const quantityIn = transactions
          .filter((t) => t.type === "IN")
          .reduce((sum, t) => sum + t.quantity, 0);

        const quantityOut = transactions
          .filter((t) => t.type === "OUT")
          .reduce((sum, t) => sum + t.quantity, 0);

        const revenue = quantityOut * product.price;

        return {
          _id: product._id,
          name: product.name,
          SKU: product.SKU,
          createdAt: product.createdAt,
          deletedAt: product.deletedAt,
          quantityIn,
          quantityOut,
          revenue,
          totalTransactions: transactions.length,
        };
      })
    );

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
