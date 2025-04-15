const Role = require("../models/Role");
const User = require("../models/User");
// Create Role
const createRole = async (req, res) => {
  try {
    const { name } = req.body;

    const existingRole = await Role.findOne({ name });
    if (existingRole)
      return res.status(400).json({ message: "Role already exists" });

    const role = new Role({ name });
    await role.save();

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Roles
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("permissions");
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update
const updatedRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: "Error updating role", error });
  }
};
//Delete
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting role", error });
  }
};
//Assign Role to User
const assignRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    user.role = roleId;
    await user.save();

    res.status(200).json({ message: "Role assigned successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error assigning role", error });
  }
};
module.exports = { createRole, getRoles, updatedRole, deleteRole, assignRole };
