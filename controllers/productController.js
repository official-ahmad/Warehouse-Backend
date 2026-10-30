const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const ActivityLog = require("../models/ActivityLog");
const ExcelJS = require("exceljs");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const productFields = [
  "name",
  "description",
  "SKU",
  "category",
  "quantity",
  "price",
  "costPrice",
  "lowStockThreshold",
  "reorderQuantity",
  "expiryDate",
  "brand",
  "barcode",
  "supplier",
  "unit",
  "location",
  "bin",
  "batchNumber",
  "weight",
  "dimensions",
];

const numberFields = [
  "quantity",
  "price",
  "costPrice",
  "lowStockThreshold",
  "reorderQuantity",
  "weight",
];

const fieldAliases = {
  productname: "name",
  itemname: "name",
  producttitle: "name",
  itemtitle: "name",
  productdescription: "description",
  itemdescription: "description",
  skucode: "SKU",
  productcode: "SKU",
  itemcode: "SKU",
  productid: "SKU",
  itemid: "SKU",
  barcodegtin: "barcode",
  productcategory: "category",
  itemcategory: "category",
  stock: "quantity",
  stockquantity: "quantity",
  openingstock: "quantity",
  initialquantity: "quantity",
  qty: "quantity",
  sellingprice: "price",
  saleprice: "price",
  unitprice: "price",
  retailprice: "price",
  purchaseprice: "costPrice",
  buyingprice: "costPrice",
  cost: "costPrice",
  minimumstock: "lowStockThreshold",
  minstock: "lowStockThreshold",
  reorderlevel: "lowStockThreshold",
  reorderpoint: "lowStockThreshold",
  reorderqty: "reorderQuantity",
  reorderamount: "reorderQuantity",
  expiry: "expiryDate",
  expirydate: "expiryDate",
  manufacturer: "brand",
  brandname: "brand",
  vendor: "supplier",
  suppliername: "supplier",
  warehouse: "location",
  warehousezone: "location",
  rack: "bin",
  rackbin: "bin",
  lotnumber: "batchNumber",
  batch: "batchNumber",
};

const resolveField = (key) => {
  const normalizedKey = String(key)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return (
    fieldAliases[normalizedKey] ||
    productFields.find(
      (candidate) =>
        candidate.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedKey,
    )
  );
};

const normalizeProductRow = (raw) => {
  const row = {};
  Object.entries(raw).forEach(([key, value]) => {
    const field = resolveField(key);
    if (field && value !== undefined && value !== null && value !== "") {
      row[field] = typeof value === "string" ? value.trim() : value;
    }
  });

  numberFields.forEach((field) => {
    if (row[field] !== undefined) row[field] = Number(row[field]);
  });
  if (row.expiryDate) {
    const parsedDate = new Date(row.expiryDate);
    row.expiryDate = Number.isNaN(parsedDate.getTime()) ? row.expiryDate : parsedDate;
  }
  return row;
};

const validateProductRow = (row, index) => {
  const required = ["name", "SKU", "category", "quantity", "price"];
  const missing = required.filter(
    (field) => row[field] === undefined || row[field] === "",
  );
  if (missing.length) {
    return `Row ${index}: missing ${missing.join(", ")}`;
  }

  if (!Number.isFinite(row.quantity) || row.quantity < 0) {
    return `Row ${index}: quantity must be a non-negative number`;
  }
  if (!Number.isFinite(row.price) || row.price < 0) {
    return `Row ${index}: price must be a non-negative number`;
  }
  for (const field of numberFields.slice(2)) {
    if (row[field] !== undefined && (!Number.isFinite(row[field]) || row[field] < 0)) {
      return `Row ${index}: ${field} must be a non-negative number`;
    }
  }
  if (row.expiryDate && typeof row.expiryDate === "string") {
    return `Row ${index}: expiryDate must be a valid date`;
  }
  return null;
};

const parseKeyValueText = (text) => {
  const rows = [];
  let current = {};
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^([^:;,]+)\s*[:;,]\s*(.+)$/);
      if (!match) return;
      const value = match[2].trim();
      const field = resolveField(match[1]);
      if (!field) return;
      if (field === "name" && current.name) {
        rows.push(current);
        current = {};
      }
      current[field] = value;
    });
  if (Object.keys(current).length) rows.push(current);
  return rows.map(normalizeProductRow);
};

const parseImportFile = async (file) => {
  const extension = file.originalname.toLowerCase().split(".").pop();
  let rows = [];
  if (extension === "xlsx" || extension === "xls" || extension === "csv") {
    if (extension === "xls") {
      throw new Error(
        "Legacy XLS is not supported. Save the file as XLSX or CSV and upload again.",
      );
    }
    const workbook = new ExcelJS.Workbook();
    if (extension === "csv") {
      await workbook.csv.load(file.buffer);
    } else {
      await workbook.xlsx.load(file.buffer);
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("The uploaded spreadsheet has no worksheet");
    const headers = worksheet.getRow(1).values
      .slice(1)
      .map((header) => String(header || "").trim());
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw = {};
      headers.forEach((header, index) => {
        raw[header] = row.getCell(index + 1).value ?? "";
      });
      rows.push(normalizeProductRow(raw));
    });
  } else if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    rows = parseKeyValueText(result.value);
  } else if (extension === "pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    rows = parseKeyValueText(result.text);
    await parser.destroy();
  } else {
    throw new Error("Unsupported file type");
  }
  return rows;
};

const validateImportRows = async (rows) => {
  const errors = rows
    .map((row, index) => validateProductRow(row, index + 2))
    .filter(Boolean);
  const skus = rows.map((row) => row.SKU).filter(Boolean);
  const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index);
  const existing = await Product.find({ SKU: { $in: skus } }).select("SKU");
  const existingSkus = existing.map((product) => product.SKU);
  if (duplicateSkus.length || existingSkus.length) {
    errors.push(
      `Duplicate SKU(s): ${[...new Set([...duplicateSkus, ...existingSkus])].join(", ")}`,
    );
  }
  return errors;
};

const saveImportedProducts = async (rows, userId, fileName) => {
  const products = await Product.insertMany(rows);
  await ActivityLog.create({
    userId,
    action: "PRODUCTS_IMPORTED",
    entityType: "Product",
    changes: { fileName, count: products.length },
  });
  return products;
};

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
      brand,
      barcode,
      supplier,
      unit,
      location,
      bin,
      batchNumber,
      weight,
      dimensions,
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
      brand,
      barcode,
      supplier,
      unit,
      location,
      bin,
      batchNumber,
      weight,
      dimensions,
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

exports.importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PDF, DOCX, XLSX, or CSV file" });
    }
    const rows = await parseImportFile(req.file);
    if (!rows.length) {
      return res.status(400).json({
        error: "No product rows found. XLSX/CSV needs a header row; PDF/DOCX needs key: value fields.",
      });
    }

    const errors = await validateImportRows(rows);
    if (errors.length) {
      return res.status(400).json({ error: "Import validation failed", details: errors });
    }

    const products = await saveImportedProducts(
      rows,
      req.user.id,
      req.file.originalname,
    );

    return res.status(201).json({
      message: `${products.length} products imported successfully`,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({ error: `Import failed: ${error.message}` });
  }
};

exports.previewProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a product file" });
    }
    const rows = await parseImportFile(req.file);
    if (!rows.length) {
      return res.status(400).json({ error: "No product rows found" });
    }
    const errors = await validateImportRows(rows);
    return res.status(errors.length ? 400 : 200).json({
      fileName: req.file.originalname,
      count: rows.length,
      rows,
      errors,
      canImport: errors.length === 0,
    });
  } catch (error) {
    return res.status(400).json({ error: `Preview failed: ${error.message}` });
  }
};

exports.confirmProducts = async (req, res) => {
  try {
    const { rows, fileName } = req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: "No preview rows supplied" });
    }
    const normalizedRows = rows.map(normalizeProductRow);
    const errors = await validateImportRows(normalizedRows);
    if (errors.length) {
      return res.status(400).json({
        error: "Import validation failed. Preview is no longer current.",
        details: errors,
      });
    }
    const products = await saveImportedProducts(
      normalizedRows,
      req.user.id,
      fileName || "preview-import",
    );
    return res.status(201).json({
      message: `${products.length} products imported successfully`,
      count: products.length,
    });
  } catch (error) {
    return res.status(500).json({ error: `Import failed: ${error.message}` });
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
