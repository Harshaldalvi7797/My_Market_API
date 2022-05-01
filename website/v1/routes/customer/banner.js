const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
// let tokenVerify = require('./../middlewares/tokenVerify');
const { addBanner, getAllBanner } = require('./../../controllers/customer/banner');
router.get('/website/getbanners', getAllBanner)
router.post('/website/addbanner', addBanner)


module.exports = router
