const express = require('express');
let { query, body } = require("express-validator");
const router = express.Router();
const { getCurrencyConversionRate } = require('./../../controllers/customer/currencyRate');

router.get('/app/currency-rate', [
  query("toCurrency").notEmpty().withMessage("Please enter valid convert to currency detail"),
], getCurrencyConversionRate);


module.exports = router;
