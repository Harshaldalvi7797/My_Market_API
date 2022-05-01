let express = require("express");
let { body } = require("express-validator");
let router = express.Router();
let { advertisementDashboard } = require('./../../../controllers/seller/dashboard/advertisement')
let tokenVerify = require('./../../../middlewares/tokenVerify');


router.post("/seller/dashboard/advertisement", [
    body("duration_type").notEmpty().withMessage("Please enter valid duration_type"),
], tokenVerify, advertisementDashboard)




module.exports = router