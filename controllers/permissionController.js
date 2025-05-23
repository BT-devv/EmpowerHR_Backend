const Role = require("../models/Role");
const Permission = require("../models/Permission");

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

    // Kiểm tra đầu vào
    if (!roleId || !permissionId) {
      return res
        .status(400)
        .json({ message: "Missing roleId or permissionId" });
    }

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    // Đảm bảo role.permissions là một mảng
    if (!role.permissions) role.permissions = [];

    // Kiểm tra trùng lặp
    const isAlreadyAssigned = role.permissions.includes(permissionId);
    if (isAlreadyAssigned) {
      return res
        .status(400)
        .json({ message: "Permission already assigned to this role" });
    }

    // Thêm permission mới
    role.permissions.push(permissionId);
    await role.save();

    res.status(200).json({ message: "Permission assigned successfully", role });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error assigning permission", error: error.message });
  }
};
// Unassign Permission from Role
const unassignPermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;

    // Kiểm tra đầu vào
    if (!roleId || !permissionId) {
      return res
        .status(400)
        .json({ message: "Missing roleId or permissionId" });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Kiểm tra xem permission có tồn tại trong role không
    const index = role.permissions.indexOf(permissionId);
    if (index === -1) {
      return res
        .status(400)
        .json({ message: "Permission not assigned to this role" });
    }

    // Xoá permission khỏi role
    role.permissions.splice(index, 1);
    await role.save();

    res
      .status(200)
      .json({ message: "Permission unassigned successfully", role });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error unassigning permission", error: error.message });
  }
};

module.exports = {
  createPermission,
  getPermission,
  assignPermission,
  deletePermission,
  unassignPermission,
};
