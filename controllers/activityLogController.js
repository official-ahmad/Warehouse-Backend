const ActivityLog = require("../models/ActivityLog");

exports.getActivityLogs = async (req, res) => {
  try {
    const { userId, action, entityType, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;

    const logs = await ActivityLog.find(filter)
      .populate("userId", "email firstName lastName")
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments(filter);

    res
      .status(200)
      .json({ logs, total, limit: parseInt(limit), skip: parseInt(skip) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const logs = await ActivityLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ActivityLog.countDocuments({ userId });

    res.status(200).json({ logs, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActivityLogsExport = async (req, res) => {
  try {
    const logs = await ActivityLog.find({})
      .populate("userId", "email firstName lastName")
      .sort({ timestamp: -1 });

    res.status(200).json({
      message: "Activity logs exported",
      data: logs,
      exportDate: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
