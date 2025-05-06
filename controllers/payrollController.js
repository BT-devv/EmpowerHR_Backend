const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Absence = require("../models/Absence");
const Overtime = require("../models/Overtime");
const Payroll = require("../models/Payroll");
const BaseSalary = require("../models/BaseSalary");
const Dependent = require("../models/Dependent");
const { sendNotification } = require("../sockets/socketManager");
const nodemailer = require("nodemailer");
const moment = require("moment");

// Helper tính các khoản
const calculatePayroll = async ({
  employeeID,
  month,
  year,
  bonus = 0,
  salaryAdvance = 0,
  salarySubtraction = 0,
}) => {
  try {
    // Lấy thông tin người dùng
    const user = await User.findOne({ employeeID });
    if (!user) {
      throw new Error("Nhân viên không tồn tại.");
    }

    const baseSalary = user.salary || 0;
    const startOfMonth = moment
      .tz(`${year}-${month}-01`, "Asia/Ho_Chi_Minh")
      .startOf("month");
    const endOfMonth = startOfMonth.clone().endOf("month");

    // ===== Đếm tổng số ngày làm việc từ Attendance =====
    const totalWorkingDays = await Attendance.countDocuments({
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
    });

    // ===== Đếm số ngày làm việc của nhân viên (không có vắng mặt) =====
    const employeeWorkingDays = await Attendance.countDocuments({
      employeeID,
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
      status: { $ne: "absent" },
    });

    const unpaidLeaveDays = totalWorkingDays - employeeWorkingDays;
    const perDaySalary = baseSalary / totalWorkingDays;
    const salaryAfterLeave = perDaySalary * employeeWorkingDays;

    // ===== Lấy dữ liệu OT đã duyệt =====
    const approvedOTs = await Overtime.find({
      employeeID,
      status: "Approved",
      date: {
        $gte: startOfMonth.format("YYYY-MM-DD"),
        $lte: endOfMonth.format("YYYY-MM-DD"),
      },
    });

    let otHoursWeekday = 0,
      otHoursWeekend = 0,
      otHoursHoliday = 0;
    approvedOTs.forEach((ot) => {
      if (ot.workingDayType === "weekday") otHoursWeekday += ot.duration;
      if (ot.workingDayType === "weekend") otHoursWeekend += ot.duration;
      if (ot.workingDayType === "holiday") otHoursHoliday += ot.duration;
    });

    // ===== Tính tiền OT =====
    const otRate = baseSalary / (totalWorkingDays * 8); // lương theo giờ
    const otAmount =
      otHoursWeekday * otRate * 1.5 +
      otHoursWeekend * otRate * 2.0 +
      otHoursHoliday * otRate * 3.0;

    // ===== Tổng thu nhập trước thuế và bảo hiểm =====
    const grossSalary = salaryAfterLeave + otAmount;

    // ===== Khấu trừ bảo hiểm (10.5%) =====
    const insuranceDeduction = grossSalary * 0.105;

    // ===== Thu nhập chịu thuế sau khi trừ bảo hiểm =====
    const taxableIncome = grossSalary - insuranceDeduction;

    // ===== Lấy số người phụ thuộc =====
    const dependentData = await Dependent.findOne({ employeeID });
    const numberOfDependents = dependentData
      ? dependentData.numberOfDependents
      : 0;

    // ===== Giảm trừ gia cảnh =====
    const personalAllowance = 11000000;
    const dependentAllowance = 4400000;
    const familyDeduction =
      personalAllowance + numberOfDependents * dependentAllowance;

    // ===== Tính thuế TNCN lũy tiến =====
    let personalIncomeTax = 0;
    const levels = [
      { max: 5000000, rate: 0.05 },
      { max: 10000000, rate: 0.1 },
      { max: 18000000, rate: 0.15 },
      { max: 32000000, rate: 0.2 },
      { max: 52000000, rate: 0.25 },
      { max: 80000000, rate: 0.3 },
      { max: Infinity, rate: 0.35 },
    ];
    let remaining = taxableIncome - familyDeduction;
    let previousMax = 0;

    for (const level of levels) {
      if (remaining <= 0) break;
      const range = Math.min(level.max - previousMax, remaining);
      personalIncomeTax += range * level.rate;
      remaining -= range;
      previousMax = level.max;
    }

    // ===== Lương thực nhận =====
    const netSalary =
      grossSalary - insuranceDeduction - Math.max(personalIncomeTax, 0);

    return {
      salaryAfterLeave,
      otAmount,
      grossSalary,
      insuranceDeduction,
      personalIncomeTax: Math.max(personalIncomeTax, 0),
      netSalary,
      totalIncome: grossSalary - salaryAdvance - salarySubtraction,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

// CREATE Payroll
const createPayroll = async (req, res) => {
  try {
    const {
      employeeID,
      bonus = 0,
      salaryAdvance = 0,
      salarySubtraction = 0,
      month,
      year,
    } = req.body;

    // ===== 1. Xác định ngày đầu và ngày cuối của tháng =====
    // Dùng object để tránh cảnh báo deprecation của moment
    const startOfMonth = moment
      .tz({ year, month: month - 1, day: 1 }, "Asia/Ho_Chi_Minh")
      .startOf("day");
    const endOfMonth = startOfMonth.clone().endOf("month").endOf("day");

    // ===== 2. Lấy thông tin nhân viên =====
    const user = await User.findOne({ employeeID }).populate(
      "department jobtitle"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employeeName = `${user.firstName} ${user.lastName}`;
    const position = user.position || "";
    const department = user.department;
    const jobtitle = user.jobtitle;

    // ===== 3. Lấy lương cơ bản =====
    const baseSalaryDoc = await BaseSalary.findOne({
      department: department._id,
      jobtitle: jobtitle._id,
    });
    if (!baseSalaryDoc) {
      return res.status(400).json({
        error: "Base salary not found for this department and job title.",
      });
    }
    const baseSalary = baseSalaryDoc.amount;

    // ===== 4. Tính tổng ngày làm việc trong tháng =====
    // (dựa vào số bản ghi Attendance bất kể employeeID)
    const totalWorkingDays = await Attendance.countDocuments({
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
    });

    // ===== 5. Tính số ngày nhân viên thực sự có mặt (không bị absent) =====
    const employeeWorkingDays = await Attendance.countDocuments({
      employeeID,
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
      status: { $ne: "absent" },
    });

    const unpaidLeaveDays = totalWorkingDays - employeeWorkingDays;

    // ===== 6. Lấy OT đã duyệt trong tháng =====
    const approvedOTs = await Overtime.find({
      employeeID,
      status: "Approved",
      date: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
    });
    let otHoursWeekday = 0,
      otHoursWeekend = 0,
      otHoursHoliday = 0;
    approvedOTs.forEach((ot) => {
      if (ot.workingDayType === "weekday") otHoursWeekday += ot.duration;
      if (ot.workingDayType === "weekend") otHoursWeekend += ot.duration;
      if (ot.workingDayType === "holiday") otHoursHoliday += ot.duration;
    });

    // ===== 7. Tính OT amount =====
    const otRate = baseSalary / (totalWorkingDays * 8);
    const otAmount =
      otHoursWeekday * otRate * 1.5 +
      otHoursWeekend * otRate * 2.0 +
      otHoursHoliday * otRate * 3.0;

    // ===== 8. Tính lương sau nghỉ và tổng thu nhập trước thuế =====
    const perDaySalary = baseSalary / totalWorkingDays;
    const salaryAfterLeave = perDaySalary * employeeWorkingDays;
    const grossSalary = salaryAfterLeave + otAmount;

    // ===== 9. Khấu trừ bảo hiểm (10.5%) =====
    const insuranceDeduction = grossSalary * 0.105;

    // ===== 10. Tính thu nhập chịu thuế =====
    const taxableIncome = grossSalary - insuranceDeduction;

    // ===== 11. Lấy số người phụ thuộc và giảm trừ gia cảnh =====
    const dependentData = await Dependent.findOne({ employeeID });
    const numberOfDependents = dependentData?.numberOfDependents || 0;
    const personalAllowance = 11_000_000;
    const dependentAllowance = 4_400_000;
    const familyDeduction =
      personalAllowance + numberOfDependents * dependentAllowance;

    // ===== 12. Tính thuế TNCN lũy tiến =====
    let personalIncomeTax = 0;
    const levels = [
      { max: 5_000_000, rate: 0.05 },
      { max: 10_000_000, rate: 0.1 },
      { max: 18_000_000, rate: 0.15 },
      { max: 32_000_000, rate: 0.2 },
      { max: 52_000_000, rate: 0.25 },
      { max: 80_000_000, rate: 0.3 },
      { max: Infinity, rate: 0.35 },
    ];
    let remaining = taxableIncome - familyDeduction;
    let prevMax = 0;
    for (const lvl of levels) {
      if (remaining <= 0) break;
      const range = Math.min(lvl.max - prevMax, remaining);
      personalIncomeTax += range * lvl.rate;
      remaining -= range;
      prevMax = lvl.max;
    }

    // ===== 13. Tính lương thực nhận và tổng còn lại =====
    const netSalary =
      grossSalary - insuranceDeduction - Math.max(personalIncomeTax, 0);
    const totalIncome = grossSalary - salaryAdvance - salarySubtraction;

    // ===== 14. Tạo hoặc cập nhật Payroll =====
    let payroll = await Payroll.findOne({ employeeID, month, year });
    const payrollData = {
      employeeID,
      employeeName,
      position,
      department: department._id,
      jobtitle: jobtitle._id,
      baseSalary,
      bonus,
      salaryAdvance,
      salarySubtraction,
      month,
      year,
      payDate: new Date(year, month - 1, 0),
      unpaidLeave: unpaidLeaveDays,
      otPay: otAmount,
      personalIncomeTax,
      total: totalIncome,
      netSalary,
    };

    if (payroll) {
      payroll.set(payrollData);
      await payroll.save();
    } else {
      payroll = new Payroll(payrollData);
      await payroll.save();
    }

    // ===== 15. Trả về kết quả 1 lần duy nhất =====
    res.status(201).json(payroll);

    // Gửi email/notification (không ảnh hưởng response)
    try {
      await sendPayrollEmail(employeeID, {
        month,
        year,
        baseSalary,
        totalWorkingDays,
        employeeWorkingDays,
        unpaidLeaveDays,
        salaryAfterLeave,
        otAmount,
        grossSalary,
        insuranceDeduction,
        personalIncomeTax,
        netSalary,
      });
      sendNotification(
        employeeID,
        "Payroll Notification",
        `Lương tháng ${month}/${year} đã có: ${netSalary.toLocaleString()} VND`
      );
    } catch (e) {
      console.error("Error sending email/notification:", e);
    }
  } catch (error) {
    console.error("Payroll creation failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

// READ all
const getAllPayrolls = async (req, res) => {
  try {
    const data = await Payroll.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ by ID
const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: "Not found" });
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
const updatePayroll = async (req, res) => {
  try {
    const calculated = calculatePayroll(req.body);
    const updated = await Payroll.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ...calculated },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
const deletePayroll = async (req, res) => {
  try {
    const deleted = await Payroll.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendPayrollEmail = async (employeeID, payrollData) => {
  try {
    const user = await User.findOne({ employeeID });
    if (!user || !user.emailCompany) {
      throw new Error("Không tìm thấy email của nhân viên.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail", // hoặc SMTP server của công ty bạn
      auth: {
        user: "lupinnguyen1811@gmail.com", // Thay bằng email của bạn
        pass: "owdn vxar raqc vznv", // Thay bằng mật khẩu ứng dụng (App Password)
      },
    });

    const mailOptions = {
      from: '"HR Department" <your_email@gmail.com>',
      to: user.emailCompany,
      subject: `Thông báo lương tháng ${payrollData.month}/${payrollData.year}`,
      html: `
        <h2>Thông báo lương tháng ${payrollData.month}/${payrollData.year}</h2>
        <h3>Employee Information</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Employee Name</b></td><td>${user.firstName} ${
        user.lastName
      }</td></tr>
          <tr><td><b>Position</b></td><td>${user.position || "N/A"}</td></tr>
        </table>

        <h3>Time Working</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Month</b></td><td>${payrollData.month}/${
        payrollData.year
      }</td></tr>
          <tr><td><b>Work Days</b></td><td>${
            payrollData.employeeWorkingDays
          } / ${payrollData.totalWorkingDays}</td></tr>
          <tr><td><b>Pay Date</b></td><td>${moment().format(
            "DD/MM/YYYY"
          )}</td></tr>
        </table>

        <h3>EARNINGS (E)</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Base Salary</b></td><td>${payrollData.baseSalary.toLocaleString()} VND</td></tr>
          <tr><td><b>Overtime (OT) Pay</b></td><td>${payrollData.otAmount.toLocaleString()} VND</td></tr>
          <tr><td><b>Others</b></td><td>0 VND</td></tr>
        </table>

        <h3>DEDUCTION (D)</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Unpaid Leave</b></td><td>${(
            payrollData.unpaidLeaveDays *
            (payrollData.baseSalary / payrollData.totalWorkingDays)
          ).toLocaleString()} VND</td></tr>
          <tr><td><b>Personal Income Tax</b></td><td>${payrollData.personalIncomeTax.toLocaleString()} VND</td></tr>
          <tr><td><b>Salary Advance</b></td><td>0 VND</td></tr>
          <tr><td><b>Salary Subtraction</b></td><td>0 VND</td></tr>
          <tr><td><b>Others</b></td><td>0 VND</td></tr>
        </table>

        <h3>NET PAY (E - D)</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Total</b></td><td>${payrollData.netSalary.toLocaleString()} VND</td></tr>
        </table>

        <h3>WORKDAYS</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><td><b>Workdays</b></td><td>${
            payrollData.employeeWorkingDays
          }</td></tr>
        </table>

        <p>Trân trọng,<br>Phòng Nhân sự</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Đã gửi email lương cho ${user.emailCompany}`);
  } catch (error) {
    console.error("Lỗi khi gửi email lương:", error);
  }
};

module.exports = {
  createPayroll,
  getAllPayrolls,
  getPayrollById,
  updatePayroll,
  deletePayroll,
};
