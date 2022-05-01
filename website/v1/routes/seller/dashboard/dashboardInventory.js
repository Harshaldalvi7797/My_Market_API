let express = require("express");
let {  query } = require("express-validator");
let router = express.Router();
let { getdashboardInventorydata  ,parentcategories} = require('./../../../controllers/seller/dashboard/dashboardInventory')
let tokenVerify = require('./../../../middlewares/tokenVerify');


router.post("/seller/dashboard/inventory", [
], tokenVerify,getdashboardInventorydata)


router.get("/seller/dashboard/parentcategories",tokenVerify, parentcategories)

module.exports = router