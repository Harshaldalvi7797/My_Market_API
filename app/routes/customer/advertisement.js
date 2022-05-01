let express = require("express");
let { query, body } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let router = express.Router();
let { advertisement, advertisementProductList, advertisementProductFilterData } = require("../../controllers/customer/advertisement");


router.get("/app/advertisement", advertisement)

router.post("/app/advertisement/products", [
    body("advertiseId").notEmpty().withMessage("Please enter a valid advertiseId.")
], advertisementProductList)

router.get("/app/advertisement/products/filter", advertisementProductFilterData)


module.exports = router