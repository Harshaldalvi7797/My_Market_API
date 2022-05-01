const express = require('express');
const router = express.Router();

const {getCountries, addCountry} = require('./../controllers/country');

router.get("/getCountries", getCountries);
//router.post("/addCountry", addCountry);

module.exports = router;