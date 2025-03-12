const Absence = require("../models/absence");
const User = require("../models/User");
const moment = require("moment-timezone");
const authenticateToken = require("../middlewares/authMiddleware");

// 📝 Gửi yêu cầu nghỉ phép
const requestAbsence = async (req, res) => {
  const { type, dateFrom, dateTo, lineManagers, reason } = req.body;
  const employeeID = req.user.employeeID;

  try {
    const employee = await User.findOne({ employeeID });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Nhân viên không tồn tại." });
    }

    const currentDate = moment().tz("Asia/Ho_Chi_Minh");
    const absenceStart = moment(dateFrom).tz("Asia/Ho_Chi_Minh");
    const absenceEnd = moment(dateTo).tz("Asia/Ho_Chi_Minh");

    // Kiểm tra ngày không được trong quá khứ
    if (absenceStart.isBefore(currentDate, "day")) {
      return res.status(400).json({
        success: false,
        message: "Không thể gửi yêu cầu nghỉ cho ngày trong quá khứ.",
      });
    }

    // Ngày kết thúc không được trước ngày bắt đầu
    if (absenceEnd.isBefore(absenceStart, "day")) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không thể trước ngày bắt đầu.",
      });
    }

    // Không cho phép nghỉ vào Thứ 7 hoặc Chủ nhật
    if (
      [6, 7].includes(absenceStart.isoWeekday()) ||
      [6, 7].includes(absenceEnd.isoWeekday())
    ) {
      return res.status(400).json({
        success: false,
        message: "Không thể gửi yêu cầu nghỉ vào Thứ 7 hoặc Chủ nhật.",
      });
    }

    // Yêu cầu nghỉ Full Day phải xin trước ít nhất 1 ngày
    if (
      type === "Full Day" &&
      absenceStart.isSameOrBefore(currentDate, "day")
    ) {
      return res.status(400).json({
        success: false,
        message: "Yêu cầu nghỉ Full Day phải được gửi trước ít nhất 1 ngày.",
      });
    }

    // Kiểm tra số ngày nghỉ tích lũy
    const leaveDays = absenceEnd.diff(absenceStart, "days") + 1;
    if (employee.accumulatedLeaveDays < leaveDays) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã hết số ngày nghỉ, nghỉ thêm sẽ bị trừ lương!",
      });
    }
    employee.accumulatedLeaveDays -= leaveDays;
    await employee.save();

    // Tạo yêu cầu nghỉ phép
    const absenceRequest = new Absence({
      employeeID,
      name: `${employee.firstName}${employee.lastName}`,
      type,
      dateFrom,
      dateTo,
      lineManagers,
      reason,
      status: "Pending",
      createdAt: moment().tz("Asia/Ho_Chi_Minh").toDate(),
      updatedAt: moment().tz("Asia/Ho_Chi_Minh").toDate(),
    });

    await absenceRequest.save();

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
  const { absenceID, status, rejectReason } = req.body;
  const approvedBy = req.user.employeeID; // Lấy ID người duyệt từ token

  try {
    const absence = await Absence.findById(absenceID);
    if (!absence) {
      return res
        .status(404)
        .json({ success: false, message: "Đơn nghỉ không tồn tại." });
    }

    // Kiểm tra xem người duyệt có phải là Line Manager không
    if (!absence.lineManagers.includes(approvedBy)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền duyệt đơn này.",
      });
    }

    // Kiểm tra nếu đơn đã được xử lý trước đó
    if (absence.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Đơn nghỉ đã được xử lý trước đó.",
      });
    }

    // Kiểm tra nếu từ chối mà không có lý do
    if (status === "Rejected" && !rejectReason) {
      return res.status(400).json({
        success: false,
        message: "Cần nhập lý do từ chối.",
      });
    }

    // Cập nhật trạng thái, người duyệt và thời gian cập nhật
    absence.status = status;
    absence.approvedBy = approvedBy;
    absence.updatedAt = moment().tz("Asia/Ho_Chi_Minh").toDate();

    if (status === "Rejected") {
      absence.rejectReason = rejectReason;
    }

    await absence.save();

    res.status(200).json({
      success: true,
      message: `Đã ${status === "Approved" ? "duyệt" : "từ chối"} đơn nghỉ.`,
      absence,
    });
  } catch (error) {
    console.error("Lỗi khi duyệt đơn nghỉ:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống.",
      error: error.message,
    });
  }
};
const getPendingAbsences = async (req, res) => {
  try {
    const pendingAbsences = await Absence.find({ status: "Pending" });

    res.status(200).json({
      success: true,
      message: "Danh sách đơn nghỉ phép đang chờ duyệt.",
      absences: pendingAbsences,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn nghỉ phép:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống.",
      error: error.message,
    });
  }
};
const getAbsencesHistory = async (req, res) => {
  try {
    const processedAbsences = await Absence.find({
      status: { $ne: "Pending" },
    });

    res.status(200).json({
      success: true,
      message: "Danh sách đơn nghỉ phép đã xử lý.",
      absences: processedAbsences,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn nghỉ phép:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi hệ thống.",
      error: error.message,
    });
  }
};

module.exports = {
  requestAbsence,
  approveAbsence,
  getAbsencesHistory,
  getPendingAbsences,
};
