const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");

let { subscribeProduct, getAllSubscription,
    getSubscribe, cancelSubscription
} = require("../../controllers/customer/subscribeProduct");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

router.post("/app/subscribe", [
    body("productVariantId").isAlphanumeric().notEmpty().withMessage("Please enter a valid productVariantId."),
    body("fromDate").notEmpty().withMessage("Please enter a valid fromDate and toDate."),
    body("toDate").notEmpty().withMessage("Please enter a valid toDate."),

    body("subscriptionType").isAlpha().notEmpty().withMessage("Please enter a valid subscriptionType."),
    body("interval").notEmpty().withMessage("Please enter a valid interval."),
    body("deliveryAddress").notEmpty().withMessage("Please enter a valid delivery address."),


    body("quantity").notEmpty().withMessage("Please enter a valid quantity."),
    body("details").notEmpty().withMessage("Please enter a valid subscription details."),

], tokenVerify, isCustomer, subscribeProduct)

router.get("/app/subscribe/getallproducts/:status", tokenVerify, isCustomer, getAllSubscription)
router.get("/app/subscribe/getproducts/:deviceIdentifier", tokenVerify, isCustomer, getSubscribe)
router.put("/app/subscribe/cancel", [
    body("subscriptionId").isAlphanumeric().notEmpty().withMessage("Please enter a valid subscriptionId."),
    body("cancelSubscriptionTapDetails").notEmpty().withMessage("Please enter a valid Cancel Subscription Tap Details."),
    body("statusComment").notEmpty().withMessage("Please enter a valid Cancel Reason."),
], tokenVerify, isCustomer, cancelSubscription)


module.exports = router