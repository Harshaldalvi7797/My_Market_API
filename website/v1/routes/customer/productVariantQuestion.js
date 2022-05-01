let express = require("express");
let router = express.Router();
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let { addQueston, allQuestions, likeDislikeQuestion, searchQuestion } = require("../../controllers/customer/productVariantQuestion");

router.post("/customer/addquestion", tokenVerify, isCustomer, addQueston)
router.get("/customer/fetchallquestions/:productVariantId", allQuestions)

router.put("/customer/question/likedislike/:id", tokenVerify, isCustomer, likeDislikeQuestion)

router.post("/customer/product/question/search", searchQuestion)


module.exports = router