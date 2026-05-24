const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const productRoutes = require("./routes/productRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();


app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/warehouse")
  .then(() => console.log("DB Connected Successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));


app.get("/", (req, res) => {
  res.json({ message: "Warehouse Management API" });
});


app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
