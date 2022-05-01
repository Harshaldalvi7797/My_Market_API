const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let { walletTransaction, getCustomerWallet, getBalance } = require('../../controllers/customer/wallet')
let tokenVerify = require('../../middlewares/tokenVerify');
let isCustomer = require('../../middlewares/isCustomer');


router.post("/app/customer/walletTransaction", tokenVerify, isCustomer, walletTransaction)
router.get("/app/customer/getwallet", tokenVerify, isCustomer, getCustomerWallet)
router.get("/app/customer/getbalance", tokenVerify, isCustomer, getBalance)

module.exports = router

// router.get('/newArrival', newArrivalProducts)
// module.exports = router