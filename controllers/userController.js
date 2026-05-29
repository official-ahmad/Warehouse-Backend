const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("-passwordHash");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json({
          error: "Email, password, firstName, and lastName are required",
        });
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
      department,
    });

    await user.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user._id,
      changes: { email, role: user.role, firstName, lastName },
    });

    res
      .status(201)
      .json({
        message: "User created successfully",
        user: { id: user._id, email: user.email, role: user.role },
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, department, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const changes = {};
    if (firstName !== undefined) {
      changes.firstName = user.firstName;
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      changes.lastName = user.lastName;
      user.lastName = lastName;
    }
    if (role !== undefined) {
      changes.role = user.role;
      user.role = role;
    }
    if (department !== undefined) {
      changes.department = user.department;
      user.department = department;
    }
    if (isActive !== undefined) {
      changes.isActive = user.isActive;
      user.isActive = isActive;
    }

    await user.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: user._id,
      changes,
    });

    res
      .status(200)
      .json({
        message: "User updated successfully",
        user: { id: user._id, email: user.email, role: user.role },
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isActive = false;
    await user.save();

    await ActivityLog.create({
      userId: req.user.id,
      action: "USER_DEACTIVATED",
      entityType: "User",
      entityId: user._id,
      changes: { isActive: true },
    });

    res.status(200).json({ message: "User deactivated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
