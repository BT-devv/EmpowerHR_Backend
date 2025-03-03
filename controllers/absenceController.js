const Absence = require("../models/absence");
const User = require("../models/User");
const moment = require("moment-timezone");
const authenticateToken = require("../middlewares/authMiddleware");

// 📝 Gửi yêu cầu nghỉ phép
const requestAbsence = async (req, res) => {
  const { type, date, halfDaySession, reason, teammate } = req.body;
  const employeeID = req.user.employeeID; // Lấy employeeID từ user đã được giải mã từ token

  try {
    const employee = await User.findOne({ employeeID: employeeID });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Nhân viên không tồn tại." });
    }

    const currentDate = moment().tz("Asia/Ho_Chi_Minh");
    const absenceDate = moment(date).tz("Asia/Ho_Chi_Minh");
    const dayOfWeek = absenceDate.isoWeekday(); // 1 = Thứ 2, ..., 7 = Chủ nhật

    // Kiểm tra ngày không được là quá khứ
    if (absenceDate.isBefore(currentDate)) {
      return res.status(400).json({
        success: false,
        message: "Không thể gửi yêu cầu nghỉ cho ngày trong quá khứ.",
      });
    }

    // Không cho phép request vào Thứ 7 (6) hoặc Chủ nhật (7)
    if (dayOfWeek === 6 || dayOfWeek === 7) {
      return res.status(400).json({
        success: false,
        message: "Không thể gửi yêu cầu nghỉ vào Thứ 7 hoặc Chủ nhật.",
      });
    }
    // Nếu nghỉ Full Day thì phải xin phép trước ít nhất 1 ngày
    if (type === "Full Day" && absenceDate.isSameOrBefore(currentDate, "day")) {
      return res.status(400).json({
        success: false,
        message: "Yêu cầu nghỉ Full Day phải được gửi trước ít nhất 1 ngày.",
      });
    }
    // Kiểm tra số ngày nghỉ tích lũy của nhân viên
    if (type === "Full Day" || type === "Half Day") {
      if (employee.accumulatedLeaveDays <= 0) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã hết số ngày nghỉ, nghỉ thêm sẽ bị trừ lương!",
        });
      }
      employee.accumulatedLeaveDays -= type === "Full Day" ? 1 : 0.5;
      await employee.save();
    }

    // Lưu vào DB
    const absenceRequest = new Absence({
      employeeID,
      type,
      date,
      halfDaySession,
      reason,
      teammate,
    });

    await absenceRequest.save();

    // Gửi thông báo cho Line Manager và team members
    const managers = await User.find({ role: "Manager" });
    const teamMembers = await User.find({
      department: employee.department,
      employeeID: { $ne: employeeID },
    });

    res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu nghỉ!",
      absence: absenceRequest,
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu nghỉ:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống.", error: error.message });
  }
};

const approveAbsence = async (req, res) => {
  const { absenceID, status } = req.body;
  const approvedBy = req.user.employeeID;

  try {
    const absence = await Absence.findById(absenceID);
    if (!absence) {
      return res
        .status(404)
        .json({ success: false, message: "Đơn nghỉ không tồn tại." });
    }

    if (absence.status !== "Pending") {
      return res
        .status(400)
        .json({ success: false, message: "Đơn nghỉ đã được xử lý trước đó." });
    }

    absence.status = status;
    absence.approvedBy = approvedBy;
    await absence.save();

    res.status(200).json({
      success: true,
      message: `Đã ${status === "Approved" ? "duyệt" : "từ chối"} đơn nghỉ.`,
    });
  } catch (error) {
    console.error("Lỗi khi duyệt đơn nghỉ:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống.", error: error.message });
  }
};

module.exports = {
  requestAbsence,
  approveAbsence,
};
