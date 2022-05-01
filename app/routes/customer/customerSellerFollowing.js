const express = require('express');
let { body, query } = require("express-validator");
const router = express.Router()

let tokenVerify = require('../../middlewares/tokenVerify');
let isCustomer = require('../../middlewares/isCustomer');
const { addCustomerSellerFollowings, getCustomerSellerFollowings, deleteCustSellerFollowing,
    customerFollowingBrandProducts, followBrandProductsFilter } = require("../../controllers/customer/customerSellerFollowing");

router.post('/app/addCustomerSellerFollowing', [
    body("sellerId").notEmpty().withMessage("Please enter a valid seller id."),
], tokenVerify, addCustomerSellerFollowings);

router.get('/app/getCustomerSellerFollowing', tokenVerify, getCustomerSellerFollowings);

router.delete('/app/deleteCustomerSellerFollowing', [
    query("sellerId").notEmpty().withMessage("Please enter a valid seller id."),
], tokenVerify, deleteCustSellerFollowing);


router.post("/app/customer/following/products", tokenVerify, isCustomer, customerFollowingBrandProducts)

router.get("/app/customer/following/products/filter", tokenVerify, isCustomer, followBrandProductsFilter)

module.exports = router