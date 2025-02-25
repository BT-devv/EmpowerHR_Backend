const User = require("../models/User");
const Attendance = require("../models/attendance");
const Absence = require("../models/absence");
const Overtime = require("../models/overtime");
const Payroll = require("../models/payroll");
const jwt = require("jsonwebtoken");

const calculatePayroll = async (req, res) => {
  try {
    // 🛠 Lấy Token từ Header và giải mã
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Token không hợp lệ" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employeeID = decoded.employeeID;

    // 🏦 Lấy thông tin User từ bảng users
    const user = await User.findOne({ employeeID: employeeID }).select(
      "bankAccount idCardNumber role companyEmail department"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    // 📆 Xác định tháng và năm tính lương
    const {
      baseSalary,
      month,
      year,
      commission = 0,
      kpiBonus = 0,
      fine = 0,
    } = req.body;
    const currentDate = new Date();
    const payrollMonth = month || currentDate.getMonth() + 1;
    const payrollYear = year || currentDate.getFullYear();

    const startDate = new Date(payrollYear, payrollMonth - 1, 1);
    const endDate = new Date(payrollYear, payrollMonth, 0, 23, 59, 59);

    // 📊 Lấy dữ liệu Attendance, Absence, Overtime
    const actualWorkDays = await Attendance.countDocuments({
      employeeID,
      status: { $ne: "absent" },
      date: { $gte: startDate, $lte: endDate },
    });

    const leaveDaysPaid = await Absence.countDocuments({
      employeeID,
      type: "Full Day",
      status: "Approved",
      date: { $gte: startDate, $lte: endDate },
    });

    const otData = await Overtime.find({
      employeeID,
      status: "Approved",
      date: { $gte: startDate, $lte: endDate },
    });
    const otHours = otData.reduce((sum, ot) => sum + ot.duration, 0);

    // 💰 Tính lương
    const dailySalary = baseSalary / 26;
    const salaryEarned = dailySalary * actualWorkDays;
    const leaveSalary = dailySalary * leaveDaysPaid;
    const otRate = 1.5;
    const otSalary = otHours * (dailySalary / 8) * otRate;
    const insurance = baseSalary * (0.08 + 0.015 + 0.01);

    let totalSalary = salaryEarned + leaveSalary + otSalary - insurance;

    if (user.department === "MKT") {
      totalSalary += commission;
    } else if (user.department === "Sale") {
      totalSalary += commission + kpiBonus;
    }

    totalSalary -= fine;

    // 📌 Kiểm tra nếu đã có Payroll của tháng đó thì cập nhật
    let payroll = await Payroll.findOne({
      employeeID,
      month: payrollMonth,
      year: payrollYear,
    });

    if (payroll) {
      // 🔄 **Cập nhật Payroll cũ**
      payroll.baseSalary = baseSalary;
      payroll.actualWorkDays = actualWorkDays;
      payroll.otHours = otHours;
      payroll.leaveDaysPaid = leaveDaysPaid;
      payroll.commission = commission;
      payroll.kpiBonus = kpiBonus;
      payroll.fine = fine;
      payroll.department = user.department;
      payroll.bankAccount = user.bankAccount;
      payroll.idCardNumber = user.idCardNumber;
      payroll.role = user.role;
      payroll.companyEmail = user.companyEmail;
      payroll.totalSalary = totalSalary;

      await payroll.save();
    } else {
      // 🆕 **Tạo Payroll mới**
      payroll = new Payroll({
        employeeID,
        baseSalary,
        actualWorkDays,
        otHours,
        leaveDaysPaid,
        commission,
        kpiBonus,
        fine,
        department: user.department,
        bankAccount: user.bankAccount,
        idCardNumber: user.idCardNumber,
        role: user.role,
        companyEmail: user.companyEmail,
        totalSalary,
        month: payrollMonth,
        year: payrollYear,
      });

      await payroll.save();
    }

    // ✅ Trả về totalSalary trong response
    res.json({
      success: true,
      message: payroll ? "Cập nhật lương thành công" : "Tính lương thành công",
      payroll,
      totalSalary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi tính lương",
      error: error.message,
    });
  }
};

module.exports = { calculatePayroll };
