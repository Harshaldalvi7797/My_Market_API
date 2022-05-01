let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
const { adminWithSearch, getPermissions, addRole, getRole, deleteRole, editRole,
    deleteAdmin, getSingleAdmin, addAdmin, updateAdmin, adminStatus,getRoleDetails


} = require("../../controllers/admin/admin");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.put("/admin/update/status", verifyAdmin, adminStatus)
router.post("/admin/withsearch/list", verifyAdmin, adminWithSearch)
router.post("/admin/create/admin", verifyAdmin, addAdmin)
router.get("/admin/single/:id", verifyAdmin, getSingleAdmin)
router.delete("/admin/delete/:_id", verifyAdmin, deleteAdmin)
router.put("/admin/update/:id", verifyAdmin, updateAdmin)
router.get("/admin/permissions", verifyAdmin, getPermissions)

router.delete("/admin/delete/role/:id", verifyAdmin, deleteRole)
router.get("/admin/role", verifyAdmin, getRole)
router.get("/admin/role/:id", verifyAdmin, getRoleDetails)
router.post("/admin/add/role", [
    body("name").notEmpty().withMessage("Please enter valid role name"),
    body("permissions").notEmpty().withMessage("Please enter valid permissions")
], verifyAdmin, addRole)
router.put("/admin/edit/role", [
    body("id").notEmpty().withMessage("Please enter valid role id"),
], verifyAdmin, editRole)

module.exports = router;