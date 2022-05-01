const express = require('express');
let { body, query } = require("express-validator");
const router = express.Router()
let tokenVerify = require('../../middlewares/tokenVerify');

let { allSeller, sellerProductvariantBybrand,
    productvariantsOfBrandsBySellerId,
    searchBrand,
    followedBrand,
    getTopSelling,
    allCategories,
    offerproducts,
    sellerOfferProducts, sellerNewArrivalProducts
} = require("../../controllers/customer/brand")

router.post("/app/seller/newarrival", [
    body("sellerId").notEmpty().withMessage("Please enter valid sellerId")
], sellerNewArrivalProducts)
router.get('/app/allseller', allSeller)
router.get('/app/brandsofsellerproductvariant', [
    query("sellerId").notEmpty().withMessage("Please enter valid sellerId")
], sellerProductvariantBybrand)
router.get('/app/sellerproductvariantofbrand', productvariantsOfBrandsBySellerId)
router.post('/app/brandsearch', [
    body("search").notEmpty().withMessage("Please enter search string"),
], searchBrand)

router.post('/app/sellertopselling', getTopSelling)//done

router.get('/app/followed-brand', tokenVerify, followedBrand);
router.get('/app/sellercategories', allCategories) // need to error handling

router.get('/app/offers/products', offerproducts)


router.post('/app/seller/offers/products', [
    body("sellerId").notEmpty().withMessage("Please enter valid sellerId"),
], sellerOfferProducts)

module.exports = router