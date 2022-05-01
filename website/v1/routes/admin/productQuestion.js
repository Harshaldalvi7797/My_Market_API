let express = require("express");
const { body } = require("express-validator");
const { allQuestions, adminUpdateAnswer, questionProductId, questionStatus } = require("../../controllers/admin/productQuestion");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/product/questions", verifyAdmin, allQuestions)

router.post("/admin/productid/question", verifyAdmin, questionProductId)
router.put("/admin/update/answer/:id", verifyAdmin, adminUpdateAnswer)

router.put("/admin/question/status", verifyAdmin, questionStatus)
module.exports = router;