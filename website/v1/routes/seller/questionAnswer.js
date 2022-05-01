let express = require("express");
let { body, query, param } = require("express-validator");
let router = express.Router();
const { questionAnswerSeller, updateAnswer ,sellerQuestions,reportQuestion , allQuestionsProduct} = require("../../controllers/seller/questionAnswer")
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require('../../middlewares/isSeller')


router.get("/seller/productvariant/questions", questionAnswerSeller)
router.put("/seller/update/answer", tokenVerify, updateAnswer)

router.post("/seller/questions",tokenVerify, sellerQuestions)

router.post("/seller/productvariant/questions", allQuestionsProduct)

router.put("/seller/question/report",[

    body("questionId").notEmpty().withMessage("Please Enter a question Id"),
],tokenVerify,isSeller, reportQuestion)


module.exports = router