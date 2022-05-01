const express = require('express');
const router = express.Router()
let { justSoldProducts, justSoldFilter } = require('../../controllers/customer/justSoldProduct')

router.post('/website/justsoldproducts', justSoldProducts)

router.get("/website/justsold/filter", justSoldFilter)

module.exports = router