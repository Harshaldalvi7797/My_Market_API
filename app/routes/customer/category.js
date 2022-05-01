const express = require('express');
const router = express.Router()
let { body, query } = require("express-validator");

const {
    getAllcategories, fetchSinglecategory, fetchProductVariantByCategory, parentCategories,
    secondlevelCategories, thirdlevelCategories
} = require("../../controllers/customer/category");

router.get("/app/parent/categories", parentCategories)

router.get("/app/secondlevel/categories", [
    query("categoryId").notEmpty().withMessage("Please enter a valid categoryId."),
], secondlevelCategories)

router.get("/app/thirdlevel/categories", [
    query("categoryId").notEmpty().withMessage("Please enter a valid categoryId."),
], thirdlevelCategories)

router.get('/app/getallcategories', getAllcategories)
router.get('/app/getsinglecategory/:id', fetchSinglecategory)
router.post('/app/category/products', fetchProductVariantByCategory)

module.exports = router
