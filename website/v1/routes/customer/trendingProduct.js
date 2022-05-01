const express = require('express');
const router = express.Router()
let { trendingProducts, trendingFilter } = require('../../controllers/customer/trendingProduct')

router.post('/website/trendingproducts', trendingProducts)

router.get("/website/trending/products/filter", trendingFilter)

module.exports = router