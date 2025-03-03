const mongoose = require("mongoose");
const Absence = require("../models/absence");
const User = require("../models/user");
const moment = require("moment-timezone");
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

// 📝 Employee gửi yêu cầu nghỉ phép
const requestAbsence = async (req, res) => {
  const { type, date, halfDaySession, reason, teammate, managerID } = req.body;
  const employeeID = req.user.employeeID; // Lấy employeeID từ token

  try {
    const employee = await User.findOne({ employeeID });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Nhân viên không tồn tại." });
    }

    const manager = await User.findOne({ employeeID: managerID });
    if (!manager) {
      return res
        .status(404)
        .json({ success: false, message: "Manager không tồn tại." });
    }

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
      managerID,
      status: "Pending",
    });

    await absenceRequest.save();

    // Gửi email cho Manager
    await sendEmail(
      manager.emailCompany,
      "New Absence Request",
      `You have a new absence request from ${employee.firstName} ${employee.lastName}.\n\nType: ${type}\nDate: ${date}\nReason: ${reason}`
    );

    res.status(201).json({
      success: true,
      message: "Đã gửi yêu cầu nghỉ và thông báo đến Manager!",
      absence: absenceRequest,
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu nghỉ:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống.", error: error.message });
  }
};

// ✅ Manager phê duyệt hoặc từ chối yêu cầu nghỉ phép
const approveAbsence = async (req, res) => {
  const { absenceID, status } = req.body;
  const managerID = req.user.employeeID; // Lấy managerID từ token

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

    // Kiểm tra managerID có trùng với managerID trong request không
    if (absence.managerID !== managerID) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xử lý đơn nghỉ này.",
      });
    }

    absence.status = status;
    absence.approvedBy = managerID;
    await absence.save();

    // Lấy thông tin employee để gửi email phản hồi
    const employee = await User.findOne({ employeeID: absence.employeeID });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Nhân viên không tồn tại." });
    }

    // Gửi email cho nhân viên
    await sendEmail(
      employee.emailCompany,
      "Absence Request Update",
      `Your absence request has been ${status.toLowerCase()} by your manager.`
    );

    res.status(200).json({
      success: true,
      message: `Đã ${
        status === "Approved" ? "duyệt" : "từ chối"
      } đơn nghỉ và thông báo đến nhân viên.`,
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
