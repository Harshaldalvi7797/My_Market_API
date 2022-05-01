const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");

let { addProductVariantReview, productVariantReview, productVariantReviewAll, likeDislikeUpdate, deleteReview,
      customerReview, editReview} = require("../../controllers/customer/reviews");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

//review product
router.get('/app/review/productvariant', tokenVerify, isCustomer, productVariantReview);
router.get('/app/review/productvariant/:productVariantId', productVariantReviewAll);

router.post('/app/review/productvariant/add', [
      body("productVariantID").notEmpty().withMessage("Please enter valid product variant id"),
      body("rating").optional().isNumeric().withMessage("Please enter valid rating"),
], tokenVerify, isCustomer, addProductVariantReview)
router.put('/app/review/likedislike/:id', tokenVerify, likeDislikeUpdate)


router.delete("/app/customer/review/delete/:id", deleteReview)

router.get("/app/customer/reviewsall",tokenVerify,customerReview)

router.put("/app/customer/edit/review",tokenVerify, editReview)
module.exports = router;
