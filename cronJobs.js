const cron = require("node-cron");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
require("dotenv").config();
const Attendance = require("./models/attendance");
const User = require("./models/User");

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB trong cron job!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

const createDailyAttendanceRecords = () => {
  cron.schedule("1 0 * * *", async () => {
    //chạy cron job lúc 00:01 sáng mỗi ngày
    //cron.schedule("* * * * *", async () => { //chạy mỗi phút
    //console.log("🔄 Đang chạy cron job mỗi phút để kiểm tra...");
    const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");

    try {
      console.log(`🔄 Đang cập nhật chấm công cho ngày ${today}...`);

      // Lấy danh sách tất cả nhân viên
      const employees = await User.find().select(
        "employeeID firstName lastName"
      );

      for (const emp of employees) {
        const existingAttendance = await Attendance.findOne({
          employeeID: emp.employeeID,
          date: today,
        });

        if (!existingAttendance) {
          await Attendance.create({
            employeeID: emp.employeeID,
            name: `${emp.firstName} ${emp.lastName}`,
            date: today,
            status: "absent", // Mặc định là vắng mặt
            workingHours: "0m",
            timeOff: "8h",
          });
        }
      }

      console.log(`✅ Đã cập nhật chấm công cho ngày ${today}`);
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật chấm công:", error);
    }
  });
};

module.exports = createDailyAttendanceRecords;
