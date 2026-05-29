const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" },
  );
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      passwordHash,
      firstName,
      lastName,
      role: role || "staff",
    });

    await user.save();

    await ActivityLog.create({
      userId: req.user?.id || user._id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user._id,
      changes: { email, role: user.role },
    });

    const token = generateToken(user);
    res
      .status(201)
      .json({
        message: "User registered successfully",
        token,
        user: { id: user._id, email: user.email, role: user.role },
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "User account is inactive" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: "LOGIN",
      entityType: "User",
      entityId: user._id,
    });

    const token = generateToken(user);
    res
      .status(200)
      .json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await ActivityLog.create({
        userId: req.user.id,
        action: "LOGOUT",
        entityType: "User",
        entityId: req.user.id,
      });
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
