const express = require('express');
let { body, query } = require("express-validator");
const router = express.Router()

let { parentCategories, secondlevelCategories, thirdlevelCategories } = require("../../controllers/customer/category")


router.get("/website/parent/categories", parentCategories)

router.get("/website/secondlevel/categories", [
    query("categoryId").notEmpty().withMessage("Please enter a valid categoryId."),
], secondlevelCategories)


router.get("/website/thirdlevel/categories", [
    query("categoryId").notEmpty().withMessage("Please enter a valid categoryId."),
], thirdlevelCategories)
module.exports = router;
