const Absence = require("../models/Absence");
const User = require("../models/User");
const moment = require("moment-timezone");
const { sendNotification } = require("../sockets/socketManager");
const Holiday = require("../models/Holiday");
const nodemailer = require("nodemailer");
// Cấu hình SMTP để gửi email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lupinnguyen1811@gmail.com", // Thay bằng email của bạn
    pass: "owdn vxar raqc vznv", // Thay bằng mật khẩu ứng dụng (App Password)
  },
});
// Hàm gửi email
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: "lupinnguyen1811@gmail.com",
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("Email sending error:", error);
  }
};
// gửi yêu cầu nghỉ phép
const requestAbsence = async (req, res) => {
  const { type, dateFrom, dateTo, lineManagers, reason, isPaidLeave } =
    req.body;
  const employeeID = req.user.employeeID;

  try {
    const employee = await User.findOne({ employeeID });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Nhân viên không tồn tại." });
    }

    const currentDate = moment().tz("Asia/Ho_Chi_Minh");
    const absenceStart = moment(dateFrom).tz("Asia/Ho_Chi_Minh").startOf("day");
    const absenceEnd = moment(dateTo).tz("Asia/Ho_Chi_Minh").endOf("day");

    // --- KIỂM TRA TRÙNG NGÀY NGHỈ ---
    const existingAbsences = await Absence.find({
      employeeID: employeeID,
      status: { $in: ["Pending", "Approved"] },
      $or: [
        {
          // Kiểm tra xem ngày nghỉ gửi có nằm trong khoảng từ dateFrom đến dateTo của đơn nghỉ đã có
          dateFrom: { $lte: absenceEnd.toDate() },
          dateTo: { $gte: absenceStart.toDate() },
        },
      ],
    });

    console.log(
      "Checking existing absences from",
      absenceStart.format(),
      "to",
      absenceEnd.format(),
      "=> found",
      existingAbsences.length
    );

    if (existingAbsences.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã có đơn xin nghỉ phép trong khoảng ngày này.",
      });
    }

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

    // Kiểm tra xem ngày nghỉ có trùng ngày Holiday không
    const conflictingHoliday = await Holiday.findOne({
      $or: [
        {
          startDate: { $lte: absenceStart.toDate() },
          endDate: { $gte: absenceStart.toDate() },
        },
        {
          startDate: { $lte: absenceEnd.toDate() },
          endDate: { $gte: absenceEnd.toDate() },
        },
        {
          startDate: { $gte: absenceStart.toDate() },
          endDate: { $lte: absenceEnd.toDate() },
        },
      ],
    });

    if (conflictingHoliday) {
      return res.status(400).json({
        success: false,
        message: `Ngày nghỉ trùng với ngày nghỉ lễ: ${conflictingHoliday.name}.`,
      });
    }

    // Tính số ngày nghỉ
    const leaveDays = absenceEnd.diff(absenceStart, "days") + 1;

    let payLeaveDays = 0;
    let unpaidLeaveDays = 0;

    if (employee.remainingDays >= leaveDays) {
      payLeaveDays = leaveDays;
      employee.remainingDays -= leaveDays;
      await employee.save();
    } else {
      payLeaveDays = employee.remainingDays;
      unpaidLeaveDays = leaveDays - employee.remainingDays;
      employee.remainingDays = 0;
      await employee.save();
    }

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
      payLeaveDays,
      unpaidLeaveDays,
      createdAt: currentDate.toDate(),
      updatedAt: currentDate.toDate(),
    });

    await absenceRequest.save();
    // Gửi thông báo cho Line Managers
    lineManagers.forEach((managerID) => {
      sendNotification(
        managerID,
        "New Absence Request",
        `Có yêu cầu nghỉ phép mới từ ${employee.firstName} ${employee.lastName}.`
      );
    });

    // Gửi email cho Manager
    await sendEmail(
      manager.emailCompany,
      "New Absence Request",
      `You have a new absence request from ${employee.firstName} ${employee.lastName}.\n\nType: ${type}\nDate: ${date}\nReason: ${reason}`
    );
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
    // Gửi thông báo cho Employee khi có thay đổi trạng thái đơn nghỉ
    sendNotification(
      absence.employeeID,
      "Absence Status Update",
      `Đơn nghỉ phép của bạn đã được ${
        status === "Approved" ? "duyệt" : "từ chối"
      }.`
    );
    // Gửi email cho nhân viên
    await sendEmail(
      employee.emailCompany,
      "Absence Request Update",
      `Your absence request has been ${status.toLowerCase()} by your manager.`
    );
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
