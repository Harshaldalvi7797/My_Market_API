let express = require("express");
let { body } = require("express-validator");
let router = express.Router();
let { getDashboardData } = require('./../../../controllers/seller/dashboard/dashboardOverview')
let tokenVerify = require('./../../../middlewares/tokenVerify');


router.post("/seller/dashboard/overview", [
    body("duration_type").notEmpty().withMessage("Please enter valid duration_type"),
], tokenVerify, getDashboardData)

module.exports = router