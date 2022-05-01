let express = require("express");
const { body } = require("express-validator");

const {productVariantSubscriptionDvertisementCheckAdmin,
	addProductvariant,
	getAllProductVariants,
	getSingleProductvariant, deleteProductVariant, getProductVariantByProductId,
	updatepeoductVariant, getProductVariant, updateStatus, productvariantWithSearch,
	getBrands, getProducts, adminupdateProductVariantPhoto, promotionalVideoAdmin, deletePromotionVideoAdmin,
	adminUpdateProductVariant, adminAddvarintSpecs, admininventoryQuantityUpdate, adminGetCategorySpecifications,
	adminMultiStatusUpdate, dropDownCategoryFilter, dropDownBrandFilter, adminApprovalStatus, adminPvExcel, adminUpdateProductimageRemove

} = require("../../controllers/admin/productVariant");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();
router.post("/admin/check/productVariantSubscriptionDvertisementCheck", verifyAdmin, productVariantSubscriptionDvertisementCheckAdmin)


router.put("/admin/delete/productvariantimage/:id", [
	body("photoOrder").notEmpty().withMessage("Please enter a photoOrder."),

], verifyAdmin, adminUpdateProductimageRemove)


router.post("/admin/productvarint/excel", verifyAdmin, adminPvExcel)

router.get("/admin/dropdown/category", verifyAdmin, dropDownCategoryFilter)
router.get("/admin/dropdown/brand", verifyAdmin, dropDownBrandFilter)
router.post("/admin/productvarint/specifications", verifyAdmin, adminAddvarintSpecs)

router.post("/admin/productvariant/withsearch", verifyAdmin, productvariantWithSearch)


router.post(
	"/admin/addproductvariant", [
	body("productSKU").notEmpty().withMessage("Please enter productSKU"),
	//  body("productCurrency").notEmpty().withMessage("Please enter productCurrency"),
	body("productGrossPrice").notEmpty().isNumeric().withMessage("Please enter  productGrossPrice"),
	body("productNetPrice").notEmpty().isNumeric().withMessage("Please enter  productNetPrice"),
	body("productTaxPercentage").notEmpty().isNumeric().withMessage("Please enter productTaxPercentage"),
	// body("productTaxSalesPercentage").notEmpty().isNumeric().withMessage("Please enter productTaxSalePercentage"),
	body("orderQuantityMax").notEmpty().isNumeric().withMessage("Please enter a product order Quantity Max."),
	body("inventoryQuantity").notEmpty().isNumeric().withMessage("Please enter a inventory Quantity."),
	body("inventoryReOrderLevel").notEmpty().isNumeric().withMessage("Please enter a product inventory ReOrderLevel."),
	body("subscription").notEmpty().withMessage("Please enter a product subscription details."),
	body("shipmentWidth").notEmpty().withMessage("Please enter a product shipmentWidth."),
	body("shipmentLength").notEmpty().withMessage("Please enter a product shipmentLength."),
	body("shipmentHeight").notEmpty().withMessage("Please enter a product shipmentHeight."),
	body("shipmentWeight").notEmpty().withMessage("Please enter a product shipmentWeight."),
], verifyAdmin, addProductvariant);

router.post("/admin/updateproductvariantimages/:id", [], verifyAdmin, adminupdateProductVariantPhoto)

router.put("/admin/updateproductvariant/:id", [], verifyAdmin, adminUpdateProductVariant)

router.post("/admin/productvariant/promotionvideo", verifyAdmin, promotionalVideoAdmin)
router.delete("/admin/productvariant/video/delete", verifyAdmin, deletePromotionVideoAdmin)


router.get("/admin/productvariants", verifyAdmin, getAllProductVariants)
router.get("/admin/productvariant/:id", verifyAdmin, getSingleProductvariant)


router.get("/admin/productVariant/:id", verifyAdmin, getProductVariant);


router.put("/admin/productvariant/active", verifyAdmin, updateStatus)
router.put("/admin/productvariant/approval", verifyAdmin, adminApprovalStatus)
router.put("/admin/productvariant/stock", [
	body("inventoryQuantity").notEmpty().withMessage("Please enter a inventoryQuantity."),
	body("productVariantId").notEmpty().withMessage("Please enter a productVariantId."),
], verifyAdmin, admininventoryQuantityUpdate)


router.delete("/admin/productVariant/:id", verifyAdmin, deleteProductVariant);
router.put("/admin/update/productVariant/:id", verifyAdmin, updatepeoductVariant);

router.get("/admin/productvariantlist/:id", getProductVariantByProductId);


router.get("/admin/allproducts", verifyAdmin, getProducts)
router.get("/admin/allbrands", verifyAdmin, getBrands)

router.get("/admin/category/specifications/:id", verifyAdmin, adminGetCategorySpecifications)


router.put("/admin/productvariant/multiple/status", [
	body("productVariantId").notEmpty().withMessage("Please enter a productVariantId."),
], verifyAdmin, adminMultiStatusUpdate)


module.exports = router;
