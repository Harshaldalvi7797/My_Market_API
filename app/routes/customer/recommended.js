const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
let { recommendedProducts, recommendedProductsFilter } = require('../../controllers/customer/recommended')


router.post('/app/recommended/products', tokenVerify, recommendedProducts)

router.get("/app/recommended/products/filter", tokenVerify, recommendedProductsFilter)

module.exports = router

