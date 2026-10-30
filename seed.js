const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function seedAdminUser() {
  try {
    if (!process.env.ADMIN_SEED_PASSWORD) {
      throw new Error(
        "ADMIN_SEED_PASSWORD must be set before running the admin seed",
      );
    }

    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/warehouse",
    );
    console.log("Connected to MongoDB");

    const adminExists = await User.findOne({ email: "admin@warehouse.com" });

    if (adminExists) {
      console.log("✅ Admin user already exists");
    } else {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD, 12);

      const adminUser = new User({
        email: "admin@warehouse.com",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        department: "Administration",
      });

      await adminUser.save();
      console.log("✅ Admin user created successfully");
      console.log("📧 Email: admin@warehouse.com");
      console.log("🔑 Password: supplied through ADMIN_SEED_PASSWORD");
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
}

seedAdminUser();
