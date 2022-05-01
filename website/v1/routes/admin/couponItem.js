let express = require("express");
let router = express.Router();
const { body, query } = require("express-validator");
const {
    addCouponItem, getCouponItems, couponItemProduct
} = require("../../controllers/admin/couponItem");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/admin/create/couponitem", [
    // body("couponId").notEmpty().withMessage("Please enter a couponId."),
    // body("discountValue").notEmpty().withMessage("Please enter a discountValue."),
    // body("discountType").notEmpty().withMessage("Please enter a discountType."),
    // body("productVariantId").notEmpty().withMessage("Please enter a productVariantId."),

], verifyAdmin, addCouponItem)

router.get("/admin/getcouponitems", verifyAdmin, getCouponItems)


router.get("/admin/coupon/products/dropdown", [
    query("startDate").notEmpty().withMessage("Please enter valid start date."),
    query("endDate").notEmpty().withMessage("Please enter valid end date.")
], couponItemProduct)




module.exports = router
