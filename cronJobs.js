const cron = require("node-cron");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
require("dotenv").config();
const Attendance = require("./models/Attendance");
const User = require("./models/User");

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB trong cron job!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

const createDailyAttendanceRecords = () => {
  cron.schedule("1 0 * * *", async () => {
    //chạy cron job lúc 00:01 sáng mỗi ngày
    //cron.schedule("* * * * *", async () => {
    //chạy mỗi phút
    console.log("🔄 Đang chạy cron job mỗi phút để kiểm tra...");
    const today = moment().tz("Asia/Ho_Chi_Minh");
    const todayStr = today.format("YYYY-MM-DD");

    try {
      console.log(`🔄 Đang cập nhật chấm công cho ngày ${todayStr}...`);

      // Lấy danh sách tất cả nhân viên
      const employees = await User.find();

      for (const emp of employees) {
        // 1. Reset remainingDays về 0 vào ngày 1 tháng 1
        if (today.date() === 1 && today.month() === 0) {
          emp.remainingDays = 0;
        }

        // 2. Cộng 1 ngày nghỉ vào ngày 1 mỗi tháng nếu nhỏ hơn 6
        if (today.date() === 1 && emp.remainingDays < 6) {
          emp.remainingDays = Math.min(emp.remainingDays + 1, 6);
        }

        //test mỗi 10 phút reset về giá trị 0
        /*if (today.minute() % 1 === 0) {
          emp.remainingDays = 0;
          console.log(`♻️ Reset remainingDays của ${emp.employeeID} về 0`);
        }

        // Cộng thêm 1 ngày nghỉ nếu nhỏ hơn 6 mỗi phút
        if (emp.remainingDays < 6) {
          emp.remainingDays = Math.min(emp.remainingDays + 1, 6);
          console.log(
            `➕ Tăng remainingDays cho ${emp.employeeID} lên ${emp.remainingDays}`
          );
        }*/

        await emp.save();

        // 3. Tạo bản ghi chấm công nếu chưa có
        const existingAttendance = await Attendance.findOne({
          employeeID: emp.employeeID,
          date: todayStr,
        });

        if (!existingAttendance) {
          await Attendance.create({
            employeeID: emp.employeeID,
            name: `${emp.firstName} ${emp.lastName}`,
            date: todayStr,
            status: "absent",
            workingHours: "0m",
            timeOff: "8h",
          });
        }
      }

      console.log(`✅ Đã cập nhật chấm công và ngày nghỉ cho ngày ${todayStr}`);
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật:", error);
    }
  });
};

module.exports = createDailyAttendanceRecords;
