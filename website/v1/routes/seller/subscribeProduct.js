let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
let { SubscribeProductGet, summarySubscribe, SellerSubscribeStatus, SellerSubscribepaymentMethod, SellerSubscribeCountry
    , subscriptionCancel, holdSubscription , activateSubscription
} = require("../../controllers/seller/subscribeProduct")
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require("../../middlewares/isSeller");



router.put("/seller/subscription/activate",tokenVerify,activateSubscription)

router.put("/seller/subscription/cancel", [
    body("subscriptionId").notEmpty().withMessage("Please enter a subscriptionId"),
    body("status").notEmpty().withMessage("Please enter a status")

], tokenVerify, subscriptionCancel)

router.put("/seller/subscription/hold", [
    body("subscriptionId").notEmpty().withMessage("Please enter a subscriptionId"),
    body("status").notEmpty().withMessage("Please enter a status"),
    body("statusComment").notEmpty().withMessage("Please enter a statusComment"),
    body("resolutionDate").notEmpty().withMessage("Please enter a resolutionDate"),

], tokenVerify, holdSubscription)
router.post("/seller/subscribe/product", tokenVerify, SubscribeProductGet)

router.get("/seller/subscribe/summary", tokenVerify, summarySubscribe)

router.get("/seller/subscribe/status", tokenVerify, SellerSubscribeStatus)
router.get("/seller/subscribe/countries", tokenVerify, SellerSubscribeCountry)

router.get("/seller/subscribe/payment", tokenVerify, SellerSubscribepaymentMethod)


module.exports = router
