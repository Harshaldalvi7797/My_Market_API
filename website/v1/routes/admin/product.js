let express = require("express");
const { body, query } = require("express-validator");

const {
	addProduct,
	getProduct,
	deleteProduct,
	updateProduct,
	getProducts,
	productSearch,
	getProductByBrandId,
	productWithSearch,
	brandsDropdown,
	categoryDropdown,
	adminApprovalProduct,
	updateProductStatus,
	productvariantWithProductId,
	childCategories,
	productExcelExport,
	productvariantWithProductIdExcel

} = require("../../controllers/admin/product");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/product/excel", verifyAdmin, productExcelExport)

router.put("/admin/product/approval", [
	body("productId").notEmpty().withMessage("Please enter a productId."),
	body("adminApproval").notEmpty().withMessage("Please enter a adminApproval."),
], verifyAdmin, adminApprovalProduct)

router.get("/admin/product/parent/categories", categoryDropdown)
router.get("/admin/child/categories", [

	query("parentCategory").notEmpty().withMessage("Please enter a valid parentCategory."),
], childCategories)
router.get("/admin/product/brands/dropdown", verifyAdmin, brandsDropdown)

router.post("/admin/product/withsearch", verifyAdmin, productWithSearch)

router.post('/admin/search/product', verifyAdmin, productSearch);

router.post(
	"/admin/product",
	[
		body("brandId")
			.notEmpty()
			.isAlphanumeric()
			.withMessage("Please enter valid brand Id")
	], verifyAdmin, addProduct
);

router.get("/admin/products", verifyAdmin, getProducts);


router.get("/admin/productByBrandid", verifyAdmin, getProductByBrandId)

router.get("/admin/product/:id", verifyAdmin, getProduct);

router.put("/admin/product/:id", verifyAdmin, updateProduct);

router.put("/admin/main/product/status", verifyAdmin, updateProductStatus)

router.delete("/admin/product/:id", verifyAdmin, deleteProduct);

router.post("/admin/product/productvariants", [
	body("productId").notEmpty().withMessage("Please enter a productId."),
], productvariantWithProductId)


router.post("/admin/product/productvariants/excel", [
	body("productId").notEmpty().withMessage("Please enter a productId."),

], productvariantWithProductIdExcel)

module.exports = router;
