const express = require('express');
const router = express.Router()
let { body, query , check} = require("express-validator");
let tokenVerify = require('./../middlewares/tokenVerify');
const { getAllcategories, fetchSinglecategory, addCategory, updateCategory } = require('./../controllers/category');

router.get('/getallcategories', getAllcategories)
router.get('/getsinglecategory/:id', fetchSinglecategory)

router.post("/seller/addcategory",[

    // body("categoryLevel").notEmpty().withMessage("Please enter a categoryLevel."),
], tokenVerify, addCategory)
router.put("/updatecategory/:id", updateCategory)

module.exports = router
