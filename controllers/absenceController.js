const Absence = require("../models/Absence");
const User = require("../models/User");
const moment = require("moment-timezone");
const { sendNotification } = require("../sockets/socketManager");
const Holiday = require("../models/Holiday");
const nodemailer = require("nodemailer");

const MONTHLY_LEAVE_DESK_LIMIT_HOURS = 2;
// Cấu hình SMTP để gửi email
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
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
  const {
    type,
    dateFrom,
    dateTo,
    lineManagers,
    reason,

    session,
    leaveFromTime,
    leaveToTime,
    teammates,
  } = req.body;

  const employeeID = req.user.employeeID;

  if (type === "Half Day" && !session) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn buổi (sáng hoặc chiều) cho Half Day.",
    });
  }

  if (type === "Leave Desk") {
    if (!leaveFromTime || !leaveToTime) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập thời gian bắt đầu và kết thúc khi chọn Leave Desk.",
      });
    }
    if (new Date(leaveToTime) <= new Date(leaveFromTime)) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
      });
    }

    // Kiểm tra quota Leave Desk trước khi tiếp tục
    const leaveDeskCheck = await checkLeaveDeskQuota(
      employeeID,
      leaveFromTime,
      leaveToTime
    );

    if (!leaveDeskCheck.success) {
      return res
        .status(leaveDeskCheck.success ? 200 : 400)
        .json(leaveDeskCheck);
    }
  }

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

    // --- Kiểm tra trùng đơn nghỉ ---
    const existingAbsences = await Absence.find({
      employeeID: employeeID,
      status: { $in: ["Pending", "Approved"] },
      $or: [
        {
          dateFrom: { $lte: absenceEnd.toDate() },
          dateTo: { $gte: absenceStart.toDate() },
        },
      ],
    });

    if (existingAbsences.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã có đơn xin nghỉ phép trong khoảng ngày này.",
      });
    }

    if (absenceStart.isBefore(currentDate, "day")) {
      return res.status(400).json({
        success: false,
        message: "Không thể gửi yêu cầu nghỉ cho ngày trong quá khứ.",
      });
    }

    if (absenceEnd.isBefore(absenceStart, "day")) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không thể trước ngày bắt đầu.",
      });
    }

    if (
      [6, 7].includes(absenceStart.isoWeekday()) ||
      [6, 7].includes(absenceEnd.isoWeekday())
    ) {
      return res.status(400).json({
        success: false,
        message: "Không thể gửi yêu cầu nghỉ vào Thứ 7 hoặc Chủ nhật.",
      });
    }

    if (
      type === "Full Day" &&
      absenceStart.isSameOrBefore(currentDate, "day")
    ) {
      return res.status(400).json({
        success: false,
        message: "Yêu cầu nghỉ Full Day phải được gửi trước ít nhất 1 ngày.",
      });
    }

    // Kiểm tra trùng ngày lễ
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

    let payLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let totalLeaveDeskHours = 0;

    if (type === "Leave Desk") {
      const from = moment(leaveFromTime);
      const to = moment(leaveToTime);
      totalLeaveDeskHours = to.diff(from, "minutes") / 60;
    } else {
      const leaveDays = absenceEnd.diff(absenceStart, "days") + 1;
      if (employee.remainingDays >= leaveDays) {
        payLeaveDays = leaveDays;
        employee.remainingDays -= leaveDays;
      } else {
        payLeaveDays = employee.remainingDays;
        unpaidLeaveDays = leaveDays - employee.remainingDays;
        employee.remainingDays = 0;
      }
      await employee.save();
    }

    // Tạo đơn nghỉ
    const absenceRequest = new Absence({
      employeeID,
      name: `${employee.firstName} ${employee.lastName}`,
      type,
      dateFrom,
      dateTo,
      lineManagers,
      teammates,
      reason,
      status: "Pending",
      session: session || undefined,
      leaveFromTime: leaveFromTime || undefined,
      leaveToTime: leaveToTime || undefined,
      totalLeaveDeskHours: totalLeaveDeskHours || 0,
      payLeaveDays,
      unpaidLeaveDays,
      createdAt: currentDate.toDate(),
      updatedAt: currentDate.toDate(),
    });

    await absenceRequest.save();

    // Gửi thông báo socket
    lineManagers.forEach((managerID) => {
      sendNotification(
        managerID,
        "New Absence Request",
        `Có yêu cầu nghỉ phép mới từ ${employee.firstName} ${employee.lastName}.`
      );
    });

    // Gửi email
    // Truy xuất thông tin lineManagers từ bảng User
    const lineManagerUsers = await User.find({
      employeeID: { $in: lineManagers },
    });

    const lineManagerEmails = lineManagerUsers.map(
      (manager) => manager.emailCompany
    );

    await sendEmail(
      lineManagerEmails,
      "New Absence Request",
      `Bạn có yêu cầu nghỉ phép mới từ ${employee.firstName} ${employee.lastName}.\n\nLoại: ${type}\nTừ ngày: ${dateFrom}\nĐến ngày: ${dateTo}\nLý do: ${reason}`
    );

    res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu nghỉ!",
      absence: absenceRequest.toObject(),
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu nghỉ:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống.", error: error.message });
  }
};
const checkLeaveDeskQuota = async (employeeID, leaveFromTime, leaveToTime) => {
  if (!leaveFromTime || !leaveToTime) {
    return {
      success: false,
      status: 400,
      message: "Thiếu thời gian bắt đầu hoặc kết thúc.",
    };
  }

  const from = moment(leaveFromTime);
  const to = moment(leaveToTime);
  const requestedMinutes = to.diff(from, "minutes");

  if (requestedMinutes <= 0) {
    return {
      success: false,
      status: 400,
      message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    };
  }

  const requestedHours = requestedMinutes / 60;

  const startOfMonth = moment().startOf("month").toDate();
  const endOfMonth = moment().endOf("month").toDate();

  try {
    const leaveDeskAbsences = await Absence.find({
      employeeID,
      type: "Leave Desk",
      status: "Approved",
      leaveFromTime: { $lte: endOfMonth },
      leaveToTime: { $gte: startOfMonth },
    });

    let usedHours = 0;

    console.log("===== Leave Desk absences in current month =====");
    console.log("Số đơn tìm được:", leaveDeskAbsences.length);
    console.log("startOfMonth:", startOfMonth);
    console.log("endOfMonth:", endOfMonth);

    leaveDeskAbsences.forEach((absence, index) => {
      console.log(
        `#${index + 1}: ${absence.leaveFromTime} → ${absence.leaveToTime} | ${
          absence.totalLeaveDeskHours
        }h (type: ${typeof absence.totalLeaveDeskHours})`
      );
      usedHours += absence.totalLeaveDeskHours || 0;
    });

    console.log(`==> Tổng số giờ đã dùng: ${usedHours.toFixed(2)}h`);

    const remainingHours = MONTHLY_LEAVE_DESK_LIMIT_HOURS - usedHours;

    if (remainingHours <= 0) {
      return {
        success: false,
        status: 400,
        message: `Bạn đã sử dụng hết ${MONTHLY_LEAVE_DESK_LIMIT_HOURS} giờ.`,
      };
    }

    if (requestedHours > remainingHours) {
      return {
        success: true,
        warning: true,
        status: 200,
        message: `Bạn chỉ còn ${remainingHours.toFixed(
          2
        )} giờ, nhưng yêu cầu ${requestedHours.toFixed(2)} giờ.`,
        remainingHours,
        requestedHours,
      };
    }

    return {
      success: true,
      status: 200,
      message: "Bạn có thể gửi yêu cầu.",
      remainingHours,
      requestedHours,
    };
  } catch (error) {
    return {
      success: false,
      status: 500,
      message: "Lỗi hệ thống.",
      error: error.message,
    };
  }
};

const approveAbsence = async (req, res) => {
  const { absenceID, status, rejectReason } = req.body;
  const approvedBy = req.user.employeeID;

  try {
    const absence = await Absence.findById(absenceID);
    if (!absence) {
      return res
        .status(404)
        .json({ success: false, message: "Đơn nghỉ không tồn tại." });
    }

    if (!absence.lineManagers.includes(approvedBy)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền duyệt đơn này.",
      });
    }

    if (absence.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Đơn nghỉ đã được xử lý trước đó.",
      });
    }

    if (status === "Rejected" && !rejectReason) {
      return res.status(400).json({
        success: false,
        message: "Cần nhập lý do từ chối.",
      });
    }

    absence.status = status;
    absence.approvedBy = approvedBy;
    absence.updatedAt = moment().tz("Asia/Ho_Chi_Minh").toDate();

    if (status === "Rejected") {
      absence.rejectReason = rejectReason;
    }

    await absence.save();

    // Gửi thông báo cho nhân viên
    sendNotification(
      absence.employeeID,
      "Absence Status Update",
      `Đơn nghỉ phép của bạn đã được ${
        status === "Approved" ? "duyệt" : "từ chối"
      }.`
    );

    const employee = await User.findOne({ employeeID: absence.employeeID });
    if (employee?.emailCompany) {
      await sendEmail(
        employee.emailCompany,
        "Absence Request Update",
        `Đơn nghỉ phép của bạn đã được ${
          status === "Approved" ? "duyệt" : "từ chối"
        } bởi quản lý.`
      );
    }

    // Nếu được duyệt và có teammates → Gửi thông báo + email cho họ
    if (
      status === "Approved" &&
      Array.isArray(absence.teammates) &&
      absence.teammates.length > 0
    ) {
      for (const teammateID of absence.teammates) {
        sendNotification(
          teammateID,
          "Teammate Absence Notice",
          `${absence.name} sẽ nghỉ (${absence.type}) từ ${moment(
            absence.dateFrom
          ).format("DD/MM/YYYY")} đến ${moment(absence.dateTo).format(
            "DD/MM/YYYY"
          )}.`
        );

        const teammate = await User.findOne({ employeeID: teammateID });
        if (teammate?.emailCompany) {
          await sendEmail(
            teammate.emailCompany,
            "Thông báo vắng mặt của đồng nghiệp",
            `${absence.name} sẽ nghỉ từ ${moment(absence.dateFrom).format(
              "DD/MM/YYYY"
            )} đến ${moment(absence.dateTo).format("DD/MM/YYYY")} (${
              absence.type
            }).`
          );
        }
      }
    }

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
