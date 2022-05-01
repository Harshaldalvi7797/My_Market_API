let express = require("express");
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

let router = express.Router();
let {
    advertisement, advertisementProductList, advertisementProductFilterData
} = require("../../controllers/customer/advertisement");

router.get("/website/advertisement", advertisement)

router.post("/website/advertisement/products", [
    body("advertiseId").notEmpty().withMessage("Please enter a valid advertiseId.")
], advertisementProductList)



router.get("/website/advertise/products/filter", advertisementProductFilterData)





module.exports = router;
