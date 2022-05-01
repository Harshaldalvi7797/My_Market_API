const express = require('express');
let { body } = require("express-validator");
const router = express.Router()
const { globalSearch, getSearchHistoryBycustomer, saveSearch } = require('../../controllers/customer/globalSearch')
let tokenVerify = require('../../middlewares/tokenVerify');

router.post('/app/globalsearch', [
    body("search").notEmpty().withMessage("Please enter search string.")

], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, globalSearch)

router.get('/app/getsearchhistory/:deviceIdentifier', async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, getSearchHistoryBycustomer)


router.post('/app/search', [
    body("search").notEmpty().withMessage("Please enter search string.")
], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, saveSearch);

module.exports = router