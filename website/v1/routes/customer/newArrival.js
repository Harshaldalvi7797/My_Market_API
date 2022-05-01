const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { newArrivalProducts, filterOptions } = require('../../controllers/customer/newArrival')


router.post('/website/newArrival', newArrivalProducts);

router.get("/website/newarrival/filter", filterOptions)
module.exports = router

// router.get('/newArrival', newArrivalProducts)
// module.exports = router