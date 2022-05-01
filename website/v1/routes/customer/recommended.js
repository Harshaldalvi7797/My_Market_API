const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
let { recommendedProducts, recommendedProductsFilter } = require('../../controllers/customer/recommended')

router.post('/website/recommended/products', tokenVerify, recommendedProducts)

router.get("/website/recommended/products/filter",tokenVerify, recommendedProductsFilter)

// router.get("/website/test/recommendedproducts",tokenVerify,testrecommendedProducts)
module.exports = router