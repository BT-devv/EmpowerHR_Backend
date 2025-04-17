const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const mongoose = require("mongoose");
const User = require("../models/User");

const uploadUserFiles = async (req, res) => {
  try {
    const files = req.files;
    const { employeeID } = req.body;

    if (!files || !employeeID) {
      return res.status(400).json({
        message: "Thiếu file hoặc employeeID",
      });
    }

    const allowedTypes = [
      "avatar",
      "photoID",
      "certificate",
      "graduationCertificate",
      "order",
    ];

    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    const conn = mongoose.connection;
    const bucket = conn.db.collection("fs.files");
    const updateFields = {};

    for (const type of allowedTypes) {
      const file = files[type];
      if (!file) continue;

      const extension = path.extname(file.name);
      const renamed = `${employeeID}_${type}${extension}`;
      const uploadPath = path.join(uploadsDir, renamed);

      await file.mv(uploadPath);

      // Xoá file cũ nếu là avatar
      if (type === "avatar") {
        const user = await User.findOne({ employeeID });
        const oldFileId = user?.avatar;
        if (oldFileId) {
          await conn.db.collection("fs.files").deleteOne({ _id: oldFileId });
          await conn.db
            .collection("fs.chunks")
            .deleteMany({ files_id: oldFileId });
        }
      }

      // Upload file bằng mongofiles
      const mongoUri = process.env.MONGO_URI;
      const cmd = `mongofiles --uri="${mongoUri}" put "${renamed}"`;

      await new Promise((resolve, reject) => {
        exec(cmd, { cwd: uploadsDir }, async (error, stdout, stderr) => {
          fs.unlinkSync(uploadPath); // luôn xoá file tạm

          if (error) {
            console.error(`❌ Upload ${type} failed:`, stderr);
            return reject(`Upload ${type} thất bại`);
          }

          const gridFile = await bucket.findOne({ filename: renamed });
          if (!gridFile) return reject(`Không tìm thấy ${type} trong GridFS`);

          updateFields[type] = gridFile._id;
          resolve();
        });
      });
    }

    // Cập nhật các field đã xử lý
    const updatedUser = await User.findOneAndUpdate(
      { employeeID },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    }

    return res.status(200).json({
      message: "Upload và cập nhật thành công",
      updatedFields: updateFields,
    });
  } catch (err) {
    console.error("❌ Lỗi server:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = {
  uploadUserFiles,
};
