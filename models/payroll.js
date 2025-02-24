const mongoose = require("mongoose");

const PayrollSchema = new mongoose.Schema({
  employeeID: {
    type: String,
    ref: "User",
    required: true,
  },
  baseSalary: { type: Number, required: true },
  workDays: { type: Number, default: 26 },
  actualWorkDays: { type: Number, required: true },
  otHours: { type: Number, default: 0 },
  otRate: { type: Number, default: 1.5 },
  leaveDaysPaid: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  kpiBonus: { type: Number, default: 0 },
  fine: { type: Number, default: 0 },
  department: { type: String, required: true },
  bankAccount: { type: String },
  idCardNumber: { type: String },
  role: { type: String },
  companyEmail: { type: String },
  totalSalary: { type: Number }, // ✅ Thêm tổng lương
  month: { type: Number, required: true }, // ✅ Tháng tính lương
  year: { type: Number, required: true }, // ✅ Năm tính lương
});

module.exports = mongoose.model("Payroll", PayrollSchema);
