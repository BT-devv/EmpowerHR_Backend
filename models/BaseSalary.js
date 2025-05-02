const mongoose = require("mongoose");

const baseSalarySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  jobtitle: { type: mongoose.Schema.Types.ObjectId, ref: "Jobtitle" },
  amount: { type: Number, required: true },
});

module.exports = mongoose.model("baseSalary", baseSalarySchema);
