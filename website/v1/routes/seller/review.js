let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
const { productAllReview, productReview, reportReview } = require('../../controllers/seller/review');
const tokenVerify = require('../../middlewares/tokenVerify')
const isSeller = require('../../middlewares/isSeller')
router.post('/seller/products/reviews', tokenVerify, isSeller, productAllReview);

router.post("/seller/productvariant/reviews", [
    body("productId").notEmpty().withMessage("Please Enter a productId Id."),
], tokenVerify, productReview)

router.put("/seller/review/report", [
    body("reviewId").notEmpty().withMessage("Please Enter a review id."),
], tokenVerify, isSeller, reportReview)

module.exports = router;