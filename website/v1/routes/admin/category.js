const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
const verifyAdmin = require("../../middlewares/verifyAdmin");
const { getAllcategories, fetchSinglecategory,
    addCategory, deleteCategory,
    updateCategory, getParentCategory,
    updateStatus, categoryWithSearch, excelCategoryDownload,
    excelUploadcategory, adminApprovalcategory , categoryLevelWise,admincategoryDropdown

} = require('./../../controllers/admin/category');

router.get("/admin/category/secodlevel",admincategoryDropdown)
 router.put("/admin/category/approval",verifyAdmin,[
	body("categoryId").notEmpty().withMessage("Please enter a categoryId."),
	body("adminApprovals").notEmpty().withMessage("Please enter a adminApproval."),
 ], adminApprovalcategory)

router.post("/admin/excel/add", excelUploadcategory);
router.post("/admin/category/excel/download", verifyAdmin, excelCategoryDownload);
router.post("/admin/category/withsearch", verifyAdmin, categoryWithSearch);
router.get('/admin/getallcategories', verifyAdmin, getAllcategories);
router.get('/admin/getsinglecategory/:id', verifyAdmin, fetchSinglecategory);
router.get('/admin/getparentcategory',
    [
        query("isParent").notEmpty().withMessage("Please enter valid isParent"),
    ], getParentCategory);
router.post("/admin/addcategory",[
    body("categoryLevel").notEmpty().withMessage("Please enter a categoryLevel."),
], addCategory);
router.delete("/admin/delete/category/:_id", verifyAdmin, deleteCategory);

router.put("/admin/updatecategory/:id", verifyAdmin, updateCategory)
router.put("/admin/category/active",[
    body("categoryId").notEmpty().withMessage("Please enter a categoryId."),
	body("active").notEmpty().withMessage("Please enter a Active."),
], verifyAdmin, updateStatus)

router.get("/admin/categorylevel/category",[
    query("categoryLevel").notEmpty().withMessage("Please enter a categoryLevel."),
] ,verifyAdmin,categoryLevelWise)
module.exports = router
