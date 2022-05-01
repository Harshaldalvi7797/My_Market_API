let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
let {
    getProductVariants, getProductVariantsBybrand,
    singleProductvariant, getProductVariantByCategory,
    getProductVariantBySellerAndCategory, allOfferproducts, fetchProductVariantByCategory, categoryproductsFilter,
    sameSpecsProducts, offerProducts, offerSalesproductFilter
} = require("../../controllers/customer/productvariant");

router.get("/website/offersales/products/filter", offerSalesproductFilter)

router.post("/website/offers/products", offerProducts)

router.post("/website/variants/specifications", sameSpecsProducts)


router.get("/website/category/products/filter", [
    query("categoryId").notEmpty().withMessage("Please enter a valid Category Id."),
], categoryproductsFilter)
router.post("/website/category/products", [
    body("categoryId").notEmpty().withMessage("Please enter a valid Category Id."),
], fetchProductVariantByCategory)

router.get('/website/fetchproductvariants', getProductVariants);
router.get('/fetchproductvariantbybrandid', getProductVariantsBybrand)
// router.get('/singleproductvariant/:id', singleProductvariant)

router.get('/website/singleproductvariant/:id', singleProductvariant)

router.get('/products/bycategoryid', [
    query("id").notEmpty().withMessage("Please enter a valid Category Id."),
], getProductVariantByCategory)

router.post('/products/bybrand/:brandid', getProductVariantBySellerAndCategory)


router.post("/website/offerall/products", allOfferproducts)

module.exports = router