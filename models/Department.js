const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  jobtitle: [{ type: mongoose.Schema.Types.ObjectId, ref: "Jobtitle" }],
});

module.exports = mongoose.model("Department", departmentSchema);
