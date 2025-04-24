const Department = require("../models/Department");
const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment)
      return res.status(400).json({ message: "Department already exists" });

    const department = new Department({ name });
    await department.save();

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All
const getAllDepartment = async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update
const updatedDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!department)
      return res.status(404).json({ message: "Department not found" });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: "Error updating Department", error });
  }
};
//Delete
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department)
      return res.status(404).json({ message: "Department not found" });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Department", error });
  }
};
module.exports = {
  createDepartment,
  getAllDepartment,
  updatedDepartment,
  deleteDepartment,
};
