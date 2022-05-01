const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");

let {
      addProductVariantReview, productVariantReview,
      productVariantReviewAll, likeDislikeUpdate,
      updateReview, deleteReview, deleteReviewPhotos
} = require("../../controllers/customer/reviews");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

//review product
router.get('/customer/all-reviews', tokenVerify, isCustomer, productVariantReview);
router.get('/review/productvariant/:productVariantId', productVariantReviewAll);
router.post('/review/productvariant/add', [
      //body("productVariantID").notEmpty().withMessage("Please enter valid product variant id"),
      body("rating").optional().isNumeric().withMessage("Please enter valid rating"),
], tokenVerify, isCustomer, addProductVariantReview)
router.put('/review/likedislike/:id', tokenVerify, isCustomer, likeDislikeUpdate)

router.put("/customer/review/update/:id", tokenVerify, isCustomer, updateReview)
router.delete("/customer/review/:id", tokenVerify, isCustomer, deleteReview)

router.put("/customer/review/removeimg", tokenVerify, deleteReviewPhotos);
/* router.get('/review/getProductReviewByCustomerId/:customerId', getReviewByCustomerId);
router.get('/review/productreview/:customerId', customerProductReview)
 */
module.exports = router;
