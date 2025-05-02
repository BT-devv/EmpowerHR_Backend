const mongoose = require("mongoose");

const PayrollSchema = new mongoose.Schema({
  employeeID: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  jobtitle: { type: mongoose.Schema.Types.ObjectId, ref: "Jobtitle" },

  month: { type: Number, required: true }, // 1 - 12
  year: { type: Number, required: true }, // 2025

  payDate: {
    type: Date,
    default: function () {
      // Tự động set ngày cuối cùng của tháng đã chọn
      return new Date(this.year, this.month, 0); // Tháng trong JS là từ 0–11
    },
  },
  baseSalary: { type: Number, required: true },
  otPay: { type: Number, default: 0 },
  unpaidLeave: { type: Number, default: 0 }, // số ngày nghỉ không phép
  workingDays: { type: Number, default: 0 },

  personalIncomeTax: { type: Number, default: 0 },
  total: { type: Number }, // Tổng trước thuế và khấu trừ
  salaryAdvance: { type: Number, default: 0 },
  salarySubtraction: { type: Number, default: 0 },
  netSalary: { type: Number }, // Thực lãnh sau tất cả khấu trừ
  numberOfDependents: { type: Number, default: 0 },
});

module.exports = mongoose.model("Payroll", PayrollSchema);
