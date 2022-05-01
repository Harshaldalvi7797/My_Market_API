const express = require('express');
let { body } = require("express-validator");
const router = express.Router()

let tokenVerify = require('../../middlewares/tokenVerify');

let { addUpdateCart, getCart, deleteCartItem } = require("../../controllers/customer/cart")


router.post('/customer/cart/add-item', async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, addUpdateCart);

router.get('/customer/cart/get-item/:deviceIdentifier', async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, getCart);

router.post('/customer/cart/remove-item/:deviceIdentifier', [
    body("productVariantId").notEmpty().withMessage("Please enter valid product variant Id"),
], async (req, res, next) => {
    if (req.header('Authorization')) {
        await tokenVerify(req, res, next);
    } else {
        next();
    }
}, deleteCartItem);


module.exports = router;


//for country
//https://ipapi.co/country_calling_code/ ;