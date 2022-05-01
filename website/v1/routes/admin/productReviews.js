let express = require("express");
const { body } = require("express-validator");
const { allReviews, deleteReview, reviewsProductId, reviewStatus, allReviewsExcel

} = require("../../controllers/admin/productReviews");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/product/allreviews/excel", verifyAdmin, allReviewsExcel)

router.post("/admin/product/allreviews", verifyAdmin, allReviews)

router.post("/admin/productid/allreviews", [
    body("productId").notEmpty().withMessage("Please enter a productId."),
], verifyAdmin, reviewsProductId)

router.delete("/admin/review/delete/:id", [
], verifyAdmin, deleteReview)

router.put("/admin/review/status", verifyAdmin, reviewStatus)

module.exports = router;