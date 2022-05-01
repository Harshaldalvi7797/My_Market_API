let express = require("express");
const { body, query } = require("express-validator");
const {
	ordersWithSearch, adminOrderStatusList,
	adminOrderShippingStatusUpdate, adminCancelOrder, adminCancelProduct,
	excelOrderExport, returnRefundedProductWithSearch, addRefundDetails
} = require("../../controllers/admin/order");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/order/withsearch", verifyAdmin, ordersWithSearch)
router.post("/admin/order/exportexcel", verifyAdmin, excelOrderExport)

router.get("/admin/order/statusList", verifyAdmin, [
	body("orderId").notEmpty().withMessage("Please enter a valid orderId")
], adminOrderStatusList)

router.put("/admin/order/status/update", [
	body("status").notEmpty().withMessage("Please enter a status"),
	body("orderShippingId").notEmpty().withMessage("Please enter a orderShippingId")
], verifyAdmin, adminOrderShippingStatusUpdate)

router.put("/admin/cancel/order", [
	body("status").notEmpty().withMessage("Please enter a status"),
	body("orderShippingId").notEmpty().withMessage("Please enter a orderShippingId")
], verifyAdmin, adminCancelOrder)

router.put("/admin/cancel/product", [
	body("CancelledComment").notEmpty().withMessage("Please enter a Cancelled Comment"),
	body("id").notEmpty().withMessage("Please enter a product item id")
], verifyAdmin, adminCancelProduct)

//order return and refund api route
router.post("/admin/orderreturnrefund/withsearch", verifyAdmin, returnRefundedProductWithSearch)

router.put("/admin/orderreturnrefund/set", [
	body("refundedAmount").not().isEmpty().withMessage("Please enter valid refund amount"),
	body("refundedTo").not().isEmpty().withMessage("Please enter valid refund to details"),
], verifyAdmin, addRefundDetails)

// router.put("/admin/order/refunded/close", [
// 	body("id").not().isEmpty().withMessage("Please enter valid order item id"),
// ], verifyAdmin, refundClosedOrder)

module.exports = router;
