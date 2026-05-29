const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ["Product", "User", "PurchaseOrder", "CycleCount", "Invoice"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    changes: {
      type: Object,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
