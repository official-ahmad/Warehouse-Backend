const Transaction = require("../models/Transaction");
const Product = require("../models/Product");

const getLowStockReport = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = {
      $expr: { $lt: ["$quantity", "$lowStockThreshold"] },
      deletedAt: null,
    };

    if (category) {
      filter.category = category;
    }

    const lowStockProducts = await Product.find(filter)
      .select("name SKU category quantity lowStockThreshold price")
      .sort({ quantity: 1 });

    const totalShortage = lowStockProducts.reduce(
      (sum, product) => sum + (product.lowStockThreshold - product.quantity),
      0,
    );

    res.json({
      totalItems: lowStockProducts.length,
      totalShortage,
      products: lowStockProducts,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch low stock report" });
  }
};

const getTopProductsReport = async (req, res) => {
  try {
    const { startDate, endDate, type, limit = 5 } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.$gte = startDate
        ? new Date(startDate)
        : new Date("2020-01-01");
      dateFilter.$lte = endDate ? new Date(endDate) : new Date();
    }

    let transactionFilter = {};
    if (Object.keys(dateFilter).length > 0) {
      transactionFilter.date = dateFilter;
    }
    if (type && (type === "IN" || type === "OUT")) {
      transactionFilter.type = type;
    }

    const topProducts = await Transaction.aggregate([
      { $match: transactionFilter },
      {
        $group: {
          _id: "$productId",
          totalTransactions: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          lastTransaction: { $max: "$date" },
        },
      },
      { $sort: { totalTransactions: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $project: {
          _id: 1,
          name: "$productData.name",
          SKU: "$productData.SKU",
          category: "$productData.category",
          totalTransactions: 1,
          totalQuantity: 1,
          lastTransaction: 1,
        },
      },
    ]);

    res.json(topProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch top products report" });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDateObj;
    }

    if (Object.keys(dateFilter).length === 0) {
      dateFilter.$gte = new Date(new Date().setDate(new Date().getDate() - 30));
    }

    const dailySummary = await Transaction.aggregate([
      { $match: { date: dateFilter } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          inCount: {
            $sum: { $cond: [{ $eq: ["$type", "IN"] }, 1, 0] },
          },
          outCount: {
            $sum: { $cond: [{ $eq: ["$type", "OUT"] }, 1, 0] },
          },
          inQuantity: {
            $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0] },
          },
          outQuantity: {
            $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(dailySummary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch daily summary" });
  }
};

module.exports = {
  getLowStockReport,
  getTopProductsReport,
  getDailySummary,
};
