const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { justSoldProducts, justSoldFilter } = require('../../controllers/customer/justSoldProducts')


router.post('/app/justsoldproducts', justSoldProducts)

router.get("/app/justsoldproducts/filter", justSoldFilter)

// router.get('/app/justsoldproducts', justSoldProducts)


module.exports = router
