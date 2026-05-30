const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const ActivityLog = require("../models/ActivityLog");


exports.createTransaction = async (req, res) => {
  try {
    const { productId, type, quantity } = req.body;


    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }


    if (!["IN", "OUT"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Transaction type must be IN or OUT" });
    }


    if (type === "OUT" && product.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient stock. Available: ${product.quantity}, Requested: ${quantity}`,
      });
    }


    const transaction = new Transaction({
      productId,
      type,
      quantity,
    });
    await transaction.save();


    if (type === "IN") {
      product.quantity += quantity;
    } else if (type === "OUT") {
      product.quantity -= quantity;
    }
    await product.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: type === "IN" ? "STOCK_ADDED" : "STOCK_REMOVED",
      entityType: "Product",
      entityId: productId,
      changes: {
        type,
        quantity,
        productName: product.name,
        previousQuantity: type === "IN" ? product.quantity - quantity : product.quantity + quantity,
        newQuantity: product.quantity,
      },
    });

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
      updatedQuantity: product.quantity,
    });
  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).json({ error: error.message });
  }
};


exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().populate(
      "productId",
      "name SKU",
    );
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getTransactionsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const transactions = await Transaction.find({ productId }).populate(
      "productId",
      "name SKU",
    );
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
