let express = require("express");
let { body, query, param } = require("express-validator");
let router = express.Router();
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require('../../middlewares/isSeller')
let {
    addProductvariant,
    fetchproductVariant,
    updateProductVariant,
    fetchproductVariantByProductId,
    updateProductVariantPhoto,
    getProductVariants,
    singleProductvariant,
    updateStatus,
    getCategorySpecifications,
    getSellersProductVariantsWithSearch,
    promotionalVideo,
    deletePromotionVideo,
    multiStatusUpdate,
    inventoryQuantityUpdate,
    updateProductimageRemove,
    sellerProductExcelDownload,
    addvarintSpecs,
    productVariantSubscriptionDvertisementCheckCheck
} = require("../../controllers/seller/productVariant")


router.post("/seller/check/productVariantSubscriptionDvertisementCheck", tokenVerify, productVariantSubscriptionDvertisementCheckCheck)

//router.put("/seller/updateproductvariantimagesnew/:id", [], tokenVerify, updateProductimages)

router.post("/seller/inventory/excel/download", tokenVerify, sellerProductExcelDownload)
router.put("/seller/productvariant/multiple/status", tokenVerify, multiStatusUpdate)
router.post("/seller/productvariant/promotionvideo", tokenVerify, isSeller, promotionalVideo)
router.delete("/productvariant/video/delete", tokenVerify, deletePromotionVideo)

router.patch("/update/pv/:id", tokenVerify, updateProductVariant)
router.post("/seller/addproductvariant", [
    body("productSKU").notEmpty().withMessage("Please enter productSKU"),
    //  body("productCurrency").notEmpty().withMessage("Please enter productCurrency"),
    body("productGrossPrice").notEmpty().isNumeric().withMessage("Please enter  productGrossPrice"),
    body("productNetPrice").notEmpty().isNumeric().withMessage("Please enter  productNetPrice"),
    body("productTaxPercentage").notEmpty().isNumeric().withMessage("Please enter productTaxPercentage"),
    // body("productTaxSalesPercentage").notEmpty().isNumeric().withMessage("Please enter productTaxSalePercentage"),
    body("orderQuantityMin").notEmpty().isNumeric().withMessage("Please enter a product order Quantity Min."),
    body("orderQuantityMax").notEmpty().isNumeric().withMessage("Please enter a product order Quantity Max."),
    body("inventoryQuantity").notEmpty().isNumeric().withMessage("Please enter a inventory Quantity."),
    body("inventoryReOrderQuantity").notEmpty().isNumeric().withMessage("Please enter a inventoryReOrderQuantity"),
    body("inventoryReOrderLevel").notEmpty().isNumeric().withMessage("Please enter a product inventory ReOrderLevel."),
    body("subscription").notEmpty().withMessage("Please enter a product subscription details."),
    body("shipmentWidth").notEmpty().withMessage("Please enter a product shipmentWidth."),
    body("shipmentLength").notEmpty().withMessage("Please enter a product shipmentLength."),
    body("shipmentHeight").notEmpty().withMessage("Please enter a product shipmentHeight."),
    body("shipmentWeight").notEmpty().withMessage("Please enter a product shipmentWeight."),

], tokenVerify, isSeller, addProductvariant)
router.get("/seller/getproductvariants", fetchproductVariant)
router.put("/seller/updateproductvariant/:id", [], tokenVerify, updateProductVariant)
router.put("/seller/deleteproductvariantimage/:id", [
    body("photoOrder").notEmpty().withMessage("Please enter a photoOrder."),

], tokenVerify, updateProductimageRemove)

router.post("/seller/updateproductvariantimages/:id", [], tokenVerify, updateProductVariantPhoto)


router.post("/seller/getvariantsbyproductid", [
    // query('productId').not().isEmpty().isAlphanumeric().withMessage('Please enter valid product id')
], tokenVerify, fetchproductVariantByProductId)



router.get('/seller/fetchproductvariants', tokenVerify, getProductVariants);

router.get('/seller/productvariant/single/:id', tokenVerify, isSeller, singleProductvariant)

router.put("/seller/productvariant/status/:id", tokenVerify, updateStatus)
router.get("/seller/category/specifications/:id", tokenVerify, getCategorySpecifications)
// router.put("/seller/product/specifications/:id", tokenVerify, isSeller, addProuctSpecifications)
// router.get("/seller/category/specifications/:id", tokenVerify, isSeller, getCategorySpecifications)

router.post("/seller/productvarintswithsearch", tokenVerify, isSeller, getSellersProductVariantsWithSearch)

router.put("/seller/productvariant/invetory", tokenVerify, isSeller, inventoryQuantityUpdate)

router.post("/seller/productvarint/specifications", tokenVerify, addvarintSpecs)
module.exports = router
