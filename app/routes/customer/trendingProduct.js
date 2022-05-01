const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { trendingProducts, trendingFilter } = require('../../controllers/customer/trendingProduct')

router.post('/app/trending/products', trendingProducts)

router.get("/app/trending/products/filter", trendingFilter)
module.exports = router

