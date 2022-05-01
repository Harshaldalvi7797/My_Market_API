let express = require("express");
let router = express.Router();

let { query } = require("express-validator");

let { getProductVariants, getProductVariantsBybrand, singleProductvariant
    , getProductVariantByCategory, getProductVariantBySellerAndCategory, sameSpecsProducts,
    offerSalesProducts, offerSalesproductFilter

} = require("../../controllers/customer/productvariant");

router.post("/app/offersales/products", offerSalesProducts)

router.get("/app/offersales/products/filter", offerSalesproductFilter)

router.post("/app/variants/specifications", sameSpecsProducts)

router.get('/app/fetchproductvariants', getProductVariants);
router.get('/app/fetchproductvariantbybrandid', getProductVariantsBybrand)
router.get('/app/singleproductvariant/:id', singleProductvariant)
router.get('/app/products/bycategoryid', getProductVariantByCategory)
// router.get('/app/products/bybrand/:brandid', getProductVariantBySellerAndCategory)
router.post('/app/products/bybrand', getProductVariantBySellerAndCategory)
module.exports = router