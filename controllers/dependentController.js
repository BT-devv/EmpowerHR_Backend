const Dependent = require("../models/Dependent");
const User = require("../models/User");

// Create Dependent
const createDependent = async (req, res) => {
  try {
    const { employeeID, numberOfDependents } = req.body;

    // Tìm user theo employeeID
    const user = await User.findOne({ employeeID });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Tự động ghép userName từ firstName + lastName
    const userName = `${user.firstName}${user.lastName}`;

    // Kiểm tra đã tồn tại
    const existing = await Dependent.findOne({ employeeID });
    if (existing)
      return res.status(400).json({ message: "Dependent already exists" });

    // Tạo mới
    const dependent = new Dependent({
      employeeID,
      userName,
      numberOfDependents,
    });

    await dependent.save();
    res.status(201).json(dependent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Dependents
const getAllDependents = async (req, res) => {
  try {
    const dependents = await Dependent.find();
    res.status(200).json(dependents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Dependent
const updateDependent = async (req, res) => {
  try {
    const { employeeID } = req.params;
    const { numberOfDependents } = req.body;

    const dependent = await Dependent.findOne({ employeeID });
    if (!dependent)
      return res.status(404).json({ message: "Dependent not found" });

    dependent.numberOfDependents =
      numberOfDependents ?? dependent.numberOfDependents;
    await dependent.save();

    res.status(200).json(dependent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Dependent
const deleteDependent = async (req, res) => {
  try {
    const { employeeID } = req.params;

    const dependent = await Dependent.findOneAndDelete({ employeeID });
    if (!dependent)
      return res.status(404).json({ message: "Dependent not found" });

    res.status(200).json({ message: "Dependent deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createDependent,
  getAllDependents,
  updateDependent,
  deleteDependent,
};
