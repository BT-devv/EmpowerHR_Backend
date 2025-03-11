const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/blacklistedToken");

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access denied. No token provided." });
  }

  try {
    // Kiểm tra token có bị blacklist không
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      return res
        .status(401)
        .json({ success: false, message: "Token is invalid or expired." });
    }

    // Xác thực token hợp lệ
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid token." });
  }
};

module.exports = authMiddleware;
