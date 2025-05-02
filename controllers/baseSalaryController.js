const Department = require("../models/Department");
const BaseSalary = require("../models/BaseSalary");

// Create BaseSalary
const createBaseSalary = async (req, res) => {
  try {
    const { name, departmentId, jobtitleIds, amount } = req.body;

    const department = await Department.findById(departmentId).populate(
      "jobtitle"
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const validJobtitleIds = department.jobtitle.map((jt) => jt._id.toString());

    const isAllJobtitlesValid = jobtitleIds.every((id) =>
      validJobtitleIds.includes(id)
    );

    if (!isAllJobtitlesValid) {
      return res
        .status(400)
        .json({ message: "Some jobtitles are not valid for this department" });
    }

    const baseSalary = await BaseSalary.create({
      name,
      department: departmentId,
      jobtitles: jobtitleIds,
      amount,
    });

    res.status(201).json(baseSalary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update BaseSalary
const updateBaseSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId, jobtitleIds, amount } = req.body;

    // Lấy bản ghi hiện tại
    const currentBaseSalary = await BaseSalary.findById(id);
    if (!currentBaseSalary) {
      return res.status(404).json({ message: "BaseSalary not found" });
    }

    // Nếu jobtitleIds không có giá trị hoặc có giá trị undefined, thì giữ lại giá trị cũ
    const updatedJobtitleIds =
      Array.isArray(jobtitleIds) && jobtitleIds.every((id) => id)
        ? jobtitleIds
        : currentBaseSalary.jobtitle;

    const updatedBaseSalary = await BaseSalary.findByIdAndUpdate(
      id,
      {
        name: name || currentBaseSalary.name,
        department: departmentId || currentBaseSalary.department,
        jobtitle: updatedJobtitleIds,
        amount: amount || currentBaseSalary.amount,
      },
      { new: true }
    );

    res.status(200).json(updatedBaseSalary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete BaseSalary
const deleteBaseSalary = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBaseSalary = await BaseSalary.findByIdAndDelete(id);

    if (!deletedBaseSalary) {
      return res.status(404).json({ message: "BaseSalary not found" });
    }

    res.status(200).json({ message: "BaseSalary deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All BaseSalaries
const getAllBaseSalaries = async (req, res) => {
  try {
    const baseSalaries = await BaseSalary.find()
      .populate("department")
      .populate("jobtitle");

    res.status(200).json(baseSalaries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createBaseSalary,
  updateBaseSalary,
  deleteBaseSalary,
  getAllBaseSalaries,
};
