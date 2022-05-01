const express = require('express');
let { query, body } = require("express-validator");
const router = express.Router();
const { getCurrencyConversionRate, addCurrencyDecimal } = require('./../../controllers/customer/currencyRate');

router.get('/currency-rate', [
  query("toCurrency").notEmpty().withMessage("Please enter valid convert to currency detail"),
], getCurrencyConversionRate);

/* router.post('/currenct-decimal',[
  body("currencyShort").notEmpty().withMessage("Please enter valid currency short name"),
  body("currencyName").notEmpty().withMessage("Please enter valid currency name"),
  body("currencyDecimal").notEmpty().withMessage("Please enter valid currency decimal"),
], addCurrencyDecimal); */

module.exports = router;
