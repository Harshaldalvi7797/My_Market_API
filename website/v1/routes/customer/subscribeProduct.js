const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");

let {
    subscribeProduct, cancelSubscription, getCardList, tapCreateOrder, tapCreateSubscription, tapCancelSubscription,
    getSubscribe, subscriptionWithSearch, addCard, removeCard
} = require("../../controllers/customer/subscribeProduct");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

router.post("/website/subscribe", [
    body("productVariantId").isAlphanumeric().notEmpty().withMessage("Please enter a valid productVariantId."),
    body("fromDate").notEmpty().withMessage("Please enter a valid fromDate and toDate."),
    body("toDate").notEmpty().withMessage("Please enter a valid toDate."),

    body("subscriptionType").isAlpha().notEmpty().withMessage("Please enter a valid subscriptionType."),
    body("interval").notEmpty().withMessage("Please enter a valid interval."),
    body("deliveryAddress").notEmpty().withMessage("Please enter a valid delivery address."),

    body("quantity").notEmpty().withMessage("Please enter a valid quantity."),
    body("details").notEmpty().withMessage("Please enter a valid subscription details."),

], tokenVerify, isCustomer, subscribeProduct)

// router.get("/website/subscribe/getallproducts/:status", tokenVerify, isCustomer, getAllSubscription)
router.post("/website/subscription", tokenVerify, isCustomer, subscriptionWithSearch)
router.get("/website/subscribe/getproducts/:deviceIdentifier", tokenVerify, isCustomer, getSubscribe)
router.put("/website/subscribe/cancel", [
    body("subscriptionId").isAlphanumeric().notEmpty().withMessage("Please enter a valid subscriptionId."),
    body("cancelSubscriptionTapDetails").notEmpty().withMessage("Please enter a valid Cancel Subscription Tap Details."),
    body("statusComment").notEmpty().withMessage("Please enter a valid Cancel Reason."),
], tokenVerify, isCustomer, cancelSubscription)

router.get("/website/subscribe/getcardlist", tokenVerify, isCustomer, getCardList)

router.post("/website/subscribe/addCard", [
    body("cardNumber").isAlphanumeric().notEmpty().withMessage("Please enter a valid cardNumber."),
    body("expiryMonth").notEmpty().withMessage("Please enter a valid expiryMonth."),
    body("expiryYear").notEmpty().withMessage("Please enter a valid expiryYear."),
    body("cvv").notEmpty().withMessage("Please enter a valid cvv."),
    body("cardHolderName").notEmpty().withMessage("Please enter a valid cardHolderName.")
], tokenVerify, isCustomer, addCard)

router.delete("/website/subscribe/removeCard", [
    query("card_id").isAlphanumeric().notEmpty().withMessage("Please enter a valid card id.")
], tokenVerify, isCustomer, removeCard)


router.post("/website/subscribe/tapCreateOrder", [
    body("data").notEmpty().withMessage("Please enter a valid data")
], tokenVerify, isCustomer, tapCreateOrder)

router.post("/website/subscribe/tapCreateSubscription", [
    body("data").notEmpty().withMessage("Please enter a valid data")
], tokenVerify, isCustomer, tapCreateSubscription)

router.delete("/website/subscribe/tapCancelSubscription", [
    query("Subscription_id").notEmpty().withMessage("Please enter a valid data")
], tokenVerify, isCustomer, tapCancelSubscription)

https://api.tap.company/v2/subscription/v1/{Subscription_id}

module.exports = router