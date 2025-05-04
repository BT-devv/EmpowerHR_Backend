const Department = require("../models/Department");
const BaseSalary = require("../models/BaseSalary");

const createBaseSalary = async (req, res) => {
  try {
    const { name, departmentId, jobtitleId, amount } = req.body;

    const baseSalary = await BaseSalary.create({
      name,
      department: departmentId,
      jobtitle: jobtitleId, // lưu 1 jobtitle duy nhất
      amount,
    });

    res.status(201).json(baseSalary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateBaseSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId, jobtitleId, amount } = req.body;

    const currentBaseSalary = await BaseSalary.findById(id);
    if (!currentBaseSalary) {
      return res.status(404).json({ message: "BaseSalary not found" });
    }

    const updatedBaseSalary = await BaseSalary.findByIdAndUpdate(
      id,
      {
        name: name || currentBaseSalary.name,
        department: departmentId || currentBaseSalary.department,
        jobtitle: jobtitleId || currentBaseSalary.jobtitle, // cập nhật jobtitle duy nhất
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

const getAllBaseSalaries = async (req, res) => {
  try {
    const baseSalaries = await BaseSalary.find()
      .populate("department")
      .populate("jobtitle"); // populate jobtitle duy nhất

    res.status(200).json(baseSalaries);
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

module.exports = {
  createBaseSalary,
  updateBaseSalary,
  deleteBaseSalary,
  getAllBaseSalaries,
};
