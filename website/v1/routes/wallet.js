const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let tokenVerify = require('./../middlewares/tokenVerify');
const isCustomer = require("./../middlewares/isCustomer");
const { walletTransaction, getCustomerWallet, getBalance } = require('./../controllers/wallet');

router.post("/customer/walletTransaction", tokenVerify, isCustomer, walletTransaction)
router.get("/customer/getwallet", tokenVerify, isCustomer, getCustomerWallet)
router.get("/customer/getbalance", tokenVerify, isCustomer, getBalance)

module.exports = router