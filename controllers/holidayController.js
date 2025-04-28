const Holiday = require("../models/Holiday");

// Create Holiday
const createHoliday = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res
        .status(400)
        .json({ error: "startDate must be before endDate" });
    }

    // Kiểm tra trùng hoặc nằm trong khoảng ngày của holiday đã tồn tại
    const conflictingHoliday = await Holiday.findOne({
      $or: [
        // Ngày bắt đầu nằm trong một kỳ nghỉ cũ
        {
          startDate: { $lte: start },
          endDate: { $gte: start },
        },
        // Ngày kết thúc nằm trong một kỳ nghỉ cũ
        {
          startDate: { $lte: end },
          endDate: { $gte: end },
        },
        // Kỳ nghỉ mới bao trùm kỳ nghỉ cũ
        {
          startDate: { $gte: start },
          endDate: { $lte: end },
        },
      ],
    });

    if (conflictingHoliday) {
      return res
        .status(400)
        .json({ error: "Holiday dates conflict with an existing holiday" });
    }

    const holiday = new Holiday({ name, startDate, endDate });
    await holiday.save();
    res.status(201).json(holiday);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All Holidays
const getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find();
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Holiday
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedHoliday = await Holiday.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedHoliday) return res.status(404).json({ error: "Not found" });
    res.json(updatedHoliday);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Holiday
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedHoliday = await Holiday.findByIdAndDelete(id);
    if (!deletedHoliday) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Holiday deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
module.exports = {
  createHoliday,
  getAllHolidays,
  updateHoliday,
  deleteHoliday,
};
