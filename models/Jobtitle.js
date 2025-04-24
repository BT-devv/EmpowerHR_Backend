const mongoose = require("mongoose");

const jobtitleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Jobtitle", jobtitleSchema);
