const Role = require("../models/Role");
const Permission = require("../models/permission");

// Create
const createPermission = async (req, res) => {
  try {
    const { name, description } = req.body;
    const permission = new Permission({ name, description });
    await permission.save();
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: "Error creating permission", error });
  }
};
//Delete
const deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);
    if (!permission)
      return res.status(404).json({ message: "Permission not found" });
    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting permission", error });
  }
};
// Get All
const getPermission = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//Assign Permission to Role
const assignPermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    role.permissions.push(permissionId);
    await role.save();

    res.status(200).json({ message: "Permission assigned successfully", role });
  } catch (error) {
    res.status(500).json({ message: "Error assigning permission", error });
  }
};
module.exports = {
  createPermission,
  getPermission,
  assignPermission,
  deletePermission,
};
