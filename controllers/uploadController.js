const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const mongoose = require("mongoose");
const User = require("../models/User");

const uploadUserFile = async (req, res) => {
  try {
    const file = req.files?.file;
    const { employeeID, type } = req.body;

    if (!file || !employeeID || !type) {
      return res.status(400).json({
        message: "Thiếu thông tin cần thiết (file, employeeID, type)",
      });
    }

    // 1. Lưu file vào thư mục tạm
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    const extension = path.extname(file.name);
    const renamed = `${employeeID}_${type}${extension}`;
    const uploadPath = path.join(uploadsDir, renamed);

    await file.mv(uploadPath);
    // ❗ Xoá avatar cũ nếu có
    if (type === "avatar") {
      const user = await User.findOne({ employeeID });
      const oldFileId = user?.avatar;

      if (oldFileId) {
        const conn = mongoose.connection;
        await conn.db.collection("fs.files").deleteOne({ _id: oldFileId });
        await conn.db
          .collection("fs.chunks")
          .deleteMany({ files_id: oldFileId });
      }
    }

    // 2. Upload file vào GridFS
    const mongoUri = process.env.MONGO_URI;
    const cmd = `mongofiles --uri="${mongoUri}" put "${renamed}"`;

    exec(cmd, { cwd: uploadsDir }, async (error, stdout, stderr) => {
      fs.unlinkSync(uploadPath); // Xoá file tạm dù thành công hay thất bại

      if (error) {
        console.error("❌ mongofiles error:", stderr);
        return res
          .status(500)
          .json({ message: "Upload thất bại", error: stderr });
      }

      console.log("✅ mongofiles success:", stdout);

      // 3. Lấy file ID từ fs.files
      const conn = mongoose.connection;
      const bucket = conn.db.collection("fs.files");

      const gridFile = await bucket.findOne({ filename: renamed });
      if (!gridFile) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy file trong GridFS" });
      }

      // 4. Cập nhật field tương ứng trong user
      const updateField = {};
      updateField[type] = gridFile._id;

      const updatedUser = await User.findOneAndUpdate(
        { employeeID },
        { $set: updateField },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên" });
      }

      return res.status(200).json({
        message: `Upload và gán ${type} thành công cho ${employeeID}`,
        fileId: gridFile._id,
      });
    });
  } catch (err) {
    console.error("❌ Lỗi server:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = {
  uploadUserFile,
};
