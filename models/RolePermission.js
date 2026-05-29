const mongoose = require("mongoose");

const rolePermissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: String,
      enum: ["admin", "manager", "staff"],
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RolePermission", rolePermissionSchema);
