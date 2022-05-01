let express = require("express");
let router = express.Router();
const {
    addCoupon, couponWithSearch, singleCouponView, couponExcel, couponProducts, editCoupon, couponStatusUpdate
} = require("../../controllers/admin/coupon");


const { body, query } = require("express-validator");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.put("/admin/coupon/status", verifyAdmin, couponStatusUpdate)

router.put("/admin/edit/coupon", verifyAdmin, editCoupon)
router.post("/admin/coupon/excel/download", verifyAdmin, couponExcel)
router.post("/admin/coupon/withsearch", verifyAdmin, couponWithSearch)

router.post("/admin/create/coupon", [
    body("couponName").notEmpty().withMessage("Please enter a couponName."),
    body("couponCode").notEmpty().withMessage("Please enter a couponCode."),
    body("startDateTime").notEmpty().withMessage("Please enter a startDateTime."),
    body("endDateTime").notEmpty().withMessage("Please enter a endDateTime."),
], verifyAdmin, addCoupon)



router.get("/admin/coupon/single", [
    query("couponId").notEmpty().withMessage("Please enter a couponId."),
], singleCouponView)


router.post("/admin/coupon/products", couponProducts)

module.exports = router
