const Role = require("../models/Role");
const User = require("../models/User");

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      console.log("▶️ Middleware checkPermission đang chạy...");
      console.log("📌 requiredPermission:", requiredPermission);
      console.log("📌 req.user:", req.user);

      if (!req.user || !req.user._id) {
        console.log("❌ Không có req.user._id");
        return res.status(401).json({ message: "Invalid token" });
      }

      const user = await User.findById(req.user._id).populate({
        path: "role", // nếu bạn đang dùng `role`, KHÔNG phải `roles`
        populate: { path: "permissions" },
      });

      if (!user) {
        console.log("❌ User không tồn tại trong DB");
        return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ User:", user.emailCompany);
      console.log("👉 User role:", user.role?.name);
      console.log("👉 Permissions:", user.role?.permissions);

      const permissions =
        user.role?.permissions?.map((perm) => perm.name) || [];

      console.log("🎯 List quyền của user:", permissions);

      if (permissions.includes(requiredPermission)) {
        console.log("✅ Có quyền. Cho phép đi tiếp.");
        return next();
      } else {
        console.log("⛔ Không có quyền:", requiredPermission);
        return res.status(403).json({ message: "Permission denied" });
      }
    } catch (error) {
      console.error("🛑 Lỗi checkPermission:", error);
      return res.status(500).json({
        message: "Error checking permission",
        error: error.message || error,
      });
    }
  };
};

module.exports = checkPermission;
