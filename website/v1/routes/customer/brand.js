const express = require('express');
let { body, query } = require("express-validator");
const router = express.Router()
let tokenVerify = require('../../middlewares/tokenVerify');


let { allSeller, sellerProductvariantBybrand,
    productvariantsOfBrandsBySellerId,
    productVariantsBySellerId,
    newLaunchesProductsByBrandSeller,
    allCategories, getSellerTopSelling, searchBrand, singleSeller, sellerBrandNewArrivalPv,
    sellerNewArrivalProducts, sellerOfferProducts

} = require("../../controllers/customer/brand")


router.post("/website/seller/newarrival", sellerNewArrivalProducts)

router.post('/website/seller/offers/products', [
    body("sellerId").notEmpty().withMessage("Please enter valid sellerId"),
], sellerOfferProducts)
// router.post("/website/seller/newarrival/products", sellerBrandNewArrivalPv)

// router.post('/website/seller/offers/products', [
//     body("sellerId").notEmpty().withMessage("Please enter valid sellerId"),
// ], sellerOfferProducts)

router.get("/website/single/seller", [
    query("sellerId").notEmpty().withMessage("Please enter valid sellerId"),
], singleSeller)

router.get('/website/allseller', allSeller)

router.get('/website/brandsofsellerproductvariant', [
    query("sellerId").notEmpty().withMessage("Please enter valid sellerId"),
], sellerProductvariantBybrand)

router.get('/website/sellerproductvariantofbrand', productvariantsOfBrandsBySellerId) //done

router.get('/website/sellerallproductvariants', [
    query("sellerId").notEmpty().withMessage("Please enter sellerId")
], productVariantsBySellerId)//done
router.get('/website/sellernewlaunches', newLaunchesProductsByBrandSeller) //done

router.get('/website/sellercategories', [
    query("sellerId").notEmpty().withMessage("Please enter valid sellerId"),
], allCategories) // need to error handling

router.post('/website/seller/topselling/products', getSellerTopSelling)//done

router.post('/website/brandsearch', [
    body("search").notEmpty().withMessage("Please enter search string"),
], searchBrand)

module.exports = router