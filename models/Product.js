const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    brand: { type: String, default: "" },
    barcode: { type: String, default: "" },
    supplier: { type: String, default: "" },
    unit: { type: String, default: "pcs" },
    location: { type: String, default: "" },
    bin: { type: String, default: "" },
    batchNumber: { type: String, default: "" },
    weight: { type: Number, default: null },
    dimensions: { type: String, default: "" },
    SKU: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      default: 10,
    },
    reorderQuantity: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
