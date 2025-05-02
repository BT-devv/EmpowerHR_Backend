const mongoose = require("mongoose");

const dependentSchema = new mongoose.Schema({
  employeeID: { type: String, required: true, unique: true, ref: "User" }, // sửa "require" thành "required"
  userName: { type: String, required: true },
  numberOfDependents: { type: Number, required: true },
});

module.exports = mongoose.model("Dependent", dependentSchema);
