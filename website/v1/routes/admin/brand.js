let express = require("express");
const {
	addBrand, getAllBrand, getSingleBrand, deleteBrand, updateBrand, brandsWithSearch, statusUpdateBrand,
	adminApproveBrand, brandExcelExport
} = require("../../controllers/admin/brand");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();
let { body } = require("express-validator");


router.post("/admin/brand/excel", verifyAdmin, brandExcelExport)
router.put("/admin/brand/approve", [
	body("brandId").notEmpty().withMessage("Please enter a brandId."),
	body("adminApproval").notEmpty().withMessage("Please enter a Active."),
], verifyAdmin, adminApproveBrand)

router.put("/admin/brand/status", [
	body("brandId").notEmpty().withMessage("Please enter a brandId."),
	body("active").notEmpty().withMessage("Please enter a Active."),
],
	verifyAdmin, statusUpdateBrand)
router.post("/admin/brands/withsearch", verifyAdmin, brandsWithSearch)

router.post("/admin/add/brand", verifyAdmin, addBrand)

router.get("/admin/brands", verifyAdmin, getAllBrand)
router.get("/admin/brand/:id", verifyAdmin, getSingleBrand)

router.put("/admin/updatebrand/:id", verifyAdmin, updateBrand)

router.delete("/admin/brand/delete/:id", verifyAdmin, updateBrand)


module.exports = router