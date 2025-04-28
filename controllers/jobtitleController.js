const Department = require("../models/Department");
const Jobtitle = require("../models/Jobtitle");
const createJobtitle = async (req, res) => {
  try {
    const { name } = req.body;

    const existingJobtitle = await Jobtitle.findOne({ name });
    if (existingJobtitle)
      return res.status(400).json({ message: "Jobtitle already exists" });

    const jobtitle = new Jobtitle({ name });
    await jobtitle.save();

    res.status(201).json(jobtitle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All
const getAllJobtitle = async (req, res) => {
  try {
    const jobtitle = await Jobtitle.find();
    res.json(jobtitle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update
const updatedJobtitle = async (req, res) => {
  try {
    const { name } = req.body;
    const jobtitle = await Jobtitle.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!jobtitle)
      return res.status(404).json({ message: "Jobtitle not found" });
    res.json(jobtitle);
  } catch (error) {
    res.status(500).json({ message: "Error updating Jobtitle", error });
  }
};
//Delete
const deleteJobtitle = async (req, res) => {
  try {
    const jobtitle = await Jobtitle.findByIdAndDelete(req.params.id);
    if (!jobtitle)
      return res.status(404).json({ message: "Jobtitle not found" });
    res.json({ message: "Jobtitle deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Jobtitle", error });
  }
};
//Assign Jobtitle to Department
const assignJobtitle = async (req, res) => {
  try {
    const { departmentId, jobtitleId } = req.body;

    // Kiểm tra input
    if (!departmentId || !jobtitleId) {
      return res
        .status(400)
        .json({ message: "Missing departmentId or jobtitleId" });
    }

    const department = await Department.findById(departmentId);
    if (!department)
      return res.status(404).json({ message: "Department not found" });

    // Đảm bảo mảng jobtitle tồn tại
    if (!department.jobtitle) department.jobtitle = [];

    // Kiểm tra nếu jobtitleId đã tồn tại trong department
    if (department.jobtitle.includes(jobtitleId)) {
      return res
        .status(400)
        .json({ message: "Jobtitle already assigned to this department" });
    }

    // Thêm jobtitle mới
    department.jobtitle.push(jobtitleId);
    await department.save();

    res
      .status(200)
      .json({ message: "Jobtitle assigned successfully", department });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error assigning jobtitle", error: error.message });
  }
};

module.exports = {
  createJobtitle,
  getAllJobtitle,
  updatedJobtitle,
  deleteJobtitle,
  assignJobtitle,
};
