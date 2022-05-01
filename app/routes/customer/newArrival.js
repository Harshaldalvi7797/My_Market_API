const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { newArrivalProducts,filterOptions   } = require('../../controllers/customer/newArrival')


router.post('/app/newArrival', newArrivalProducts)

router.get("/app/newarrival/filter", filterOptions)

module.exports = router
