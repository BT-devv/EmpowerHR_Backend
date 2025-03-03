const mongoose = require("mongoose");
const Overtime = require("../models/overtime");
const User = require("../models/User");
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

// Nhân viên gửi yêu cầu OT
const requestOvertime = async (req, res) => {
  try {
    const employeeID = req.user.employeeID;
    const { startTime, endTime, reason, managerID } = req.body;

    // Lấy thông tin nhân viên
    const user = await User.findOne({ employeeID });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Lấy thông tin manager
    const manager = await User.findOne({ employeeID: managerID });
    if (!manager) {
      return res
        .status(404)
        .json({ success: false, message: "Manager not found" });
    }

    const date = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    const duration = moment(endTime, "HH:mm").diff(
      moment(startTime, "HH:mm"),
      "hours",
      true
    );

    if (duration <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OT time range" });
    }

    const overtime = new Overtime({
      employeeID,
      name: `${user.firstName} ${user.lastName}`,
      date,
      startTime,
      endTime,
      duration,
      reason,
      status: "Pending",
      managerID,
    });

    await overtime.save();

    // Gửi email cho manager (dùng emailCompany)
    await sendEmail(
      manager.emailCompany,
      "New Overtime Request",
      `You have a new overtime request from ${user.firstName} ${user.lastName}.\n\nStart Time: ${startTime}\nEnd Time: ${endTime}\nReason: ${reason}`
    );

    res.status(200).json({
      success: true,
      message: "Overtime request submitted and email sent to manager",
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

    if (overtime.managerID !== managerID) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized to update this request",
        });
    }

    overtime.status = status;
    await overtime.save();

    // Lấy thông tin nhân viên để gửi email phản hồi
    const employee = await User.findOne({ employeeID: overtime.employeeID });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Gửi email cho nhân viên (dùng emailCompany)
    await sendEmail(
      employee.emailCompany,
      "Overtime Request Update",
      `Your overtime request has been ${status.toLowerCase()} by your manager.`
    );

    res.status(200).json({
      success: true,
      message: `Overtime ${status.toLowerCase()} and email sent to employee`,
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
