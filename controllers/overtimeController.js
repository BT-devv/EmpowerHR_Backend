const Overtime = require("../models/overtime");
const User = require("../models/User");
const moment = require("moment-timezone");
//Nhân viên gửi request OT
const requestOvertime = async (req, res) => {
  try {
    // Lấy employeeID từ token
    const employeeID = req.user.employeeID;

    const { date, startTime, endTime, reason } = req.body; // Nhận date từ request

    // Tìm nhân viên theo employeeID
    const user = await User.findOne({ employeeID });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Lấy thời gian hiện tại ở múi giờ Việt Nam
    const now = moment().tz("Asia/Ho_Chi_Minh");
    const today = now.clone().startOf("day");

    // Chuyển đổi ngày request từ string sang Moment
    const requestDate = moment(date, "YYYY-MM-DD").tz("Asia/Ho_Chi_Minh");
    console.log(`Ngày request: ${date}, Thứ: ${requestDate.isoWeekday()}`);

    // Kiểm tra nếu ngày request là quá khứ
    if (requestDate.isBefore(today)) {
      return res.status(400).json({
        success: false,
        message: "Cannot request OT for past dates",
      });
    }

    // Chuyển đổi startTime và endTime sang Moment
    const startDateTime = moment(`${date} ${startTime}`, "YYYY-MM-DD HH:mm").tz(
      "Asia/Ho_Chi_Minh"
    );
    const endDateTime = moment(`${date} ${endTime}`, "YYYY-MM-DD HH:mm").tz(
      "Asia/Ho_Chi_Minh"
    );

    // Kiểm tra nếu thời gian OT là quá khứ
    if (startDateTime.isBefore(now)) {
      return res.status(400).json({
        success: false,
        message: "Cannot request OT for a past time.",
      });
    }
    if (endDateTime.isBefore(now)) {
      return res.status(400).json({
        success: false,
        message: "Cannot request OT for a past time.",
      });
    }

    // Kiểm tra thời gian OT hợp lệ (endTime phải sau startTime)
    if (!endDateTime.isAfter(startDateTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OT time range",
      });
    }

    // Lấy thứ trong tuần (1 = Thứ 2, ..., 7 = Chủ Nhật)
    const dayOfWeek = requestDate.isoWeekday();

    // Chỉ kiểm tra ràng buộc giờ OT nếu là Thứ 2 - Thứ 6
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const allowedStartTime = moment(`${date} 17:30`, "YYYY-MM-DD HH:mm").tz(
        "Asia/Ho_Chi_Minh"
      );
      if (startDateTime.isBefore(allowedStartTime)) {
        return res.status(400).json({
          success: false,
          message: "OT time must be after 17:30 on weekdays (Mon-Fri)",
        });
      }
    }

    // Tính toán thời gian OT (giờ)
    const duration = endDateTime.diff(startDateTime, "hours", true);

    // Lưu vào database
    const overtime = new Overtime({
      employeeID,
      name: `${user.firstName} ${user.lastName}`,
      date,
      startTime,
      endTime,
      duration,
      reason,
      status: "Pending",
    });

    await overtime.save();
    res.status(200).json({
      success: true,
      message: "Overtime request submitted",
      data: overtime,
    });
  } catch (error) {
    console.error("Overtime request error:", error);
    res.status(500).json({
      success: false,
      message: "Error during overtime request",
      error: error.message,
    });
  }
};

// Manager phê duyệt hoặc từ chối OT
const updateOvertimeStatus = async (req, res) => {
  try {
    // Lấy managerID từ token
    const managerID = req.user.employeeID;

    const { overtimeID, status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const overtime = await Overtime.findById(overtimeID);
    if (!overtime) {
      return res
        .status(404)
        .json({ success: false, message: "Overtime request not found" });
    }

    overtime.status = status;
    overtime.managerID = managerID;
    await overtime.save();

    res.status(200).json({
      success: true,
      message: `Overtime ${status.toLowerCase()}`,
      data: overtime,
    });
  } catch (error) {
    console.error("Update overtime error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating overtime status",
      error: error.message,
    });
  }
};

module.exports = {
  requestOvertime,
  updateOvertimeStatus,
};
