const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const productRoutes = require("./routes/productRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const authMiddleware = require("./middleware/auth");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "same-origin");
  next();
});
app.use(express.json({ limit: "100kb" }));

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/warehouse")
  .then(() => console.log("DB Connected Successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.json({ message: "Warehouse Management API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/transactions", authMiddleware, transactionRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
