let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
let {
    ordersWithSearch, bulkorderStatusUpdate, singleOrder, cancelOrder,
    orderShippingStatusUpdate, sellerCancelProduct } = require("../../controllers/seller/order")
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require("../../middlewares/isSeller");


router.post("/seller/orders/withsearch", tokenVerify, ordersWithSearch)

router.get("/seller/single/order", tokenVerify, singleOrder)
router.put("/seller/order/bulk/status", [
    body("status").notEmpty().withMessage("Please enter a status"),
    body("orderShippingId").notEmpty().withMessage("Please enter a orderShippingId"),
], tokenVerify, bulkorderStatusUpdate)

/* router.put("/seller/cancel/order", [
    body("status").notEmpty().withMessage("Please enter a status"),
    body("orderShippingId").notEmpty().withMessage("Please enter a orderShippingId")
], tokenVerify, isSeller, cancelOrder) */
router.put("/seller/cancel/product", [
    body("CancelledComment").notEmpty().withMessage("Please enter a Cancelled Comment"),
    body("id").notEmpty().withMessage("Please enter a product item id")
], tokenVerify, sellerCancelProduct)
router.put("/seller/order/status/update", [
    body("status").notEmpty().withMessage("Please enter a status"),
    body("orderShippingId").notEmpty().withMessage("Please enter a orderShippingId")
], tokenVerify, orderShippingStatusUpdate)

module.exports = router
