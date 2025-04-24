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
module.exports = {
  createJobtitle,
  getAllJobtitle,
  updatedJobtitle,
  deleteJobtitle,
};
