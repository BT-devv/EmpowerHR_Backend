const cron = require("node-cron");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
require("dotenv").config();
const Attendance = require("./models/Attendance");
const User = require("./models/User");
const Holiday = require("./models/Holiday");
const Absence = require("./models/Absence");

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB trong cron job!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

const createDailyAttendanceRecords = () => {
  cron.schedule("1 0 * * *", async () => {
    // Chạy cron job lúc 00:01 mỗi ngày
    //chạy cron job lúc 00:01 sáng mỗi ngày
    //cron.schedule("* * * * *", async () => {
    //chạy mỗi phút
    console.log("🔄 Đang chạy cron job...");

    const today = moment().tz("Asia/Ho_Chi_Minh");
    const todayStr = today.format("YYYY-MM-DD");
    const dayOfWeek = today.day(); // 0: Chủ nhật, 1: Thứ 2, ..., 6: Thứ 7

    // Bỏ qua Thứ 7 và Chủ Nhật
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(
        `🚫 Hôm nay là Thứ ${
          dayOfWeek === 0 ? "Chủ nhật" : "Bảy"
        }. Không chạy cron job.`
      );
      return;
    }

    try {
      // Kiểm tra có phải ngày lễ không
      const isHoliday = await Holiday.findOne({
        startDate: { $lte: today.toDate() },
        endDate: { $gte: today.toDate() },
      });

      if (isHoliday) {
        console.log(
          `🚫 Hôm nay (${todayStr}) là ngày lễ: ${isHoliday.name}. Không chạy cron job.`
        );
        return;
      }

      console.log(`🔄 Đang cập nhật chấm công cho ngày ${todayStr}...`);

      // Lấy danh sách nhân viên
      const employees = await User.find();

      for (const emp of employees) {
        // Reset remainingDays về 0 vào ngày 1 tháng 1
        if (today.date() === 1 && today.month() === 0) {
          emp.remainingDays = 0;
        }

        // Cộng thêm 1 ngày nghỉ vào ngày 1 mỗi tháng nếu nhỏ hơn 6
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
        // 👉 Kiểm tra xem hôm nay nhân viên này có absence approved không
        const hasApprovedAbsence = await Absence.findOne({
          employeeID: emp.employeeID,
          status: "Approved",
          dateFrom: { $lte: today.toDate() },
          dateTo: { $gte: today.toDate() },
        });

        const status = hasApprovedAbsence ? "absent" : "pending";
        // Tạo bản ghi chấm công (nếu chưa có) - dùng upsert
        await Attendance.updateOne(
          { employeeID: emp.employeeID, date: todayStr },
          {
            $setOnInsert: {
              name: `${emp.firstName} ${emp.lastName}`,
              status: "absent",
              workingHours: "0m",
              timeOff: "8h",
            },
          },
          { upsert: true }
        );
      }

      console.log(`✅ Đã cập nhật chấm công và ngày nghỉ cho ngày ${todayStr}`);
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật:", error);
    }
  });
};

module.exports = createDailyAttendanceRecords;
