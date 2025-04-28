const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Absence = require("../models/Absence");
const Overtime = require("../models/Overtime");
const Payroll = require("../models/Payroll");
const { sendNotification } = require("../sockets/socketManager");

const moment = require("moment");

// Helper tính các khoản
const calculatePayroll = (data) => {
  const {
    baseSalary,
    overtimeHours,
    bonus = 0,
    unpaidLeaveDays = 0,
    salaryAdvance = 0,
    salarySubtraction = 0,
  } = data;

  const workDay = 26;
  const workHour = 8;
  const hourlyRate = baseSalary / (workDay * workHour);
  const overtimePay = overtimeHours * hourlyRate * 2;
  const unpaidLeaveDeduction = (baseSalary / 26) * unpaidLeaveDays;
  const insuranceDeduction = baseSalary * 0.105;

  const totalIncome = baseSalary + overtimePay + bonus;
  const personalDeduction = 4500000;
  const taxableIncome = Math.max(
    0,
    totalIncome - insuranceDeduction - personalDeduction
  );

  const calculateTax = (income) => {
    const brackets = [
      { max: 5000000, rate: 0.05 },
      { max: 10000000, rate: 0.1 },
      { max: 18000000, rate: 0.15 },
      { max: 32000000, rate: 0.2 },
      { max: 52000000, rate: 0.25 },
      { max: 80000000, rate: 0.3 },
      { max: Infinity, rate: 0.35 },
    ];

    let remaining = income;
    let tax = 0;
    let prev = 0;

    for (const b of brackets) {
      const amount = Math.min(b.max - prev, remaining);
      if (amount > 0) {
        tax += amount * b.rate;
        remaining -= amount;
        prev = b.max;
      }
      if (remaining <= 0) break;
    }
    return tax;
  };

  const personalIncomeTax = calculateTax(taxableIncome);

  const netSalary =
    totalIncome -
    unpaidLeaveDeduction -
    insuranceDeduction -
    personalIncomeTax -
    salaryAdvance -
    salarySubtraction;

  return {
    overtimePay,
    unpaidLeaveDeduction,
    insuranceDeduction,
    personalIncomeTax,
    totalIncome,
    netSalary,
  };
};

// CREATE
const createPayroll = async (req, res) => {
  try {
    const {
      employeeID,
      baseSalary,
      bonus,
      salaryAdvance,
      salarySubtraction,
      month,
      year,
    } = req.body;

    const startDate = moment({ year: year, month: month - 1, day: 1 });

    const endDate = moment(startDate).endOf("month");

    // OT
    const overtimeDocs = await Overtime.find({
      employeeID,
      status: "Approved",
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    });

    const overtimeHours = overtimeDocs.reduce(
      (total, ot) => total + (ot.duration || 0),
      0
    );

    // Absence
    const absenceDocs = await Absence.find({
      employeeID,
      status: "Approved",
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    });

    const compensatedHours = absenceDocs.reduce((total, ab) => {
      if (["fullday", "remote"].includes(ab.type)) return total + 8;
      if (ab.type === "halfday") return total + 4;
      return total;
    }, 0);

    // Attendance
    const attendanceDocs = await Attendance.find({
      employeeID,
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    });

    const workedHours = attendanceDocs.reduce(
      (total, att) => total + (att.workingHours || 0),
      0
    );

    const totalExpectedHours = 26 * 8;
    const actualWorkedHours = workedHours + compensatedHours;
    const missingHours = Math.max(0, totalExpectedHours - actualWorkedHours);
    const unpaidLeaveDays = isNaN(missingHours) ? 0 : missingHours / 8;

    // Tính lương
    const calculated = calculatePayroll({
      baseSalary,
      overtimeHours,
      bonus,
      unpaidLeaveDays,
      salaryAdvance,
      salarySubtraction,
    });

    // Lấy thông tin nhân viên
    const user = await User.findOne({ employeeID });
    if (!user) return res.status(404).json({ error: "User not found" });

    const employeeName = `${user.firstName} ${user.lastName}`;
    const position = user.position || "";

    // Kiểm tra xem đã có bảng lương chưa
    let payroll = await Payroll.findOne({ employeeID, month, year });

    const payrollData = {
      employeeID,
      employeeName,
      position,
      baseSalary,
      bonus,
      salaryAdvance,
      salarySubtraction,
      month,
      year,
      payDate: new Date(year, month - 1, 0), // ngày cuối tháng
      unpaidLeave: unpaidLeaveDays,
      otPay: calculated.overtimePay,
      personalIncomeTax: calculated.personalIncomeTax,
      total: calculated.totalIncome,
      netSalary: calculated.netSalary,
    };

    if (payroll) {
      // Nếu có thì cập nhật
      payroll.set(payrollData);
      await payroll.save();
    } else {
      // Nếu chưa thì tạo mới
      payroll = new Payroll(payrollData);
      await payroll.save();
    }

    res.status(201).json(payroll);
    sendNotification(
      employeeID,
      "Payroll Notification",
      `Lương tháng ${month}/${year} đã có: ${calculated.netSalary.toLocaleString()} VND`
    );
  } catch (error) {
    console.error("Payroll error:", error);
    res.status(500).json({ error: error.message });
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
module.exports = {
  createPayroll,
  getAllPayrolls,
  getPayrollById,
  updatePayroll,
  deletePayroll,
};
