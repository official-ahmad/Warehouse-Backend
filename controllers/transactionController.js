const Transaction = require("../models/Transaction");
const Product = require("../models/Product");

// Create transaction and update product quantity
exports.createTransaction = async (req, res) => {
  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    const { productId, type, quantity } = req.body;

    // Validate product exists
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Product not found" });
    }

    // Validate transaction type
    if (!["IN", "OUT"].includes(type)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Transaction type must be IN or OUT" });
    }

    // Check stock for OUT transactions
    if (type === "OUT" && product.quantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        error: `Insufficient stock. Available: ${product.quantity}, Requested: ${quantity}`,
      });
    }

    // Create transaction
    const transaction = new Transaction({
      productId,
      type,
      quantity,
    });
    await transaction.save({ session });

    // Update product quantity
    if (type === "IN") {
      product.quantity += quantity;
    } else if (type === "OUT") {
      product.quantity -= quantity;
    }
    await product.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
      updatedQuantity: product.quantity,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
};

// Get all transactions
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

// Get transactions by product ID
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
