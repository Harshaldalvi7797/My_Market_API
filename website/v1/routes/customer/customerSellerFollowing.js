const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");
let tokenVerify = require('../../middlewares/tokenVerify');
let isCustomer = require('../../middlewares/isCustomer');
const { addCustomerSellerFollowings, getCustomerSellerFollowings,
    deleteCustSellerFollowing, customerFollowingBrandProducts, followBrandProductsFilter } =
    require('../../controllers/customer/customerSellerFollowing');

router.post('/addCustomerSellerFollowing', [
    body("sellerId").notEmpty().withMessage("Please enter a valid seller id."),
], tokenVerify, isCustomer, addCustomerSellerFollowings);
router.get('/getCustomerSellerFollowing', tokenVerify, getCustomerSellerFollowings);
router.delete('/deleteCustomerSellerFollowing', [
    query("sellerId").notEmpty().withMessage("Please enter a valid seller id."),
], tokenVerify, isCustomer, deleteCustSellerFollowing);

router.post("/website/customer/following/products", tokenVerify, isCustomer, customerFollowingBrandProducts)

router.get("/website/following/products/filter", tokenVerify, followBrandProductsFilter)
module.exports = router