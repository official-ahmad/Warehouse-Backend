const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const loginRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || now - current.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now });
    return next();
  }

  if (current.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: "Too many login attempts. Please try again later.",
    });
  }

  current.count += 1;
  return next();
};

module.exports = loginRateLimit;
