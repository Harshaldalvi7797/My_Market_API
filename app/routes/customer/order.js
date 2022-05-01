let express = require("express");
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let router = express.Router();
let {
    createOrder, fetchAllOrderByCustomerId,
    cancelOrder, generateId, orderProduct, returnOrderItem, orderStatusTracking
} = require("../../controllers/customer/order")


router.get("/app/order/products", [
    query("orderId").notEmpty().withMessage("Please enter orderId"),
], tokenVerify, isCustomer, orderProduct)

router.put("/app/customer/cancel/order/:id", [
    body("orderItems").notEmpty().withMessage("Please enter order items")
], tokenVerify, isCustomer, cancelOrder)

router.put("/app/customer/return/order/:id", [
    body("orderItems").notEmpty().withMessage("Please enter order items")
], tokenVerify, isCustomer, returnOrderItem)

router.get("/app/customer/order/status", [
    query("id").notEmpty().withMessage("Please enter valid order shipping id")
], tokenVerify, isCustomer, orderStatusTracking)

router.post("/app/customer/createorder", [
    body("id").notEmpty().isAlphanumeric().withMessage("Please enter valid orderId"),
    body("deviceIdentifier").notEmpty().withMessage("Please enter valid device identifier"),
    body("billingAddressId").notEmpty().withMessage("Please enter valid billing address"),
    body("shippingAddressId").notEmpty().withMessage("Please enter valid shipping address"),
    body("paymentMethod").notEmpty().withMessage("Please enter payment method."),
    body("productVariants").notEmpty().withMessage("Please enter product variant details."),
], tokenVerify, isCustomer, createOrder)

router.get("/app/customer/vieworderbystatus", [
    query("status").notEmpty().withMessage("Please enter order status"),
], tokenVerify, isCustomer, fetchAllOrderByCustomerId)

router.get("/app/customer/generateId", tokenVerify, isCustomer, generateId) //checkout page
module.exports = router