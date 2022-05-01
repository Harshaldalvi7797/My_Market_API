let express = require("express");
let router = express.Router();
let { body, query,check } = require("express-validator");
let { getAllBrands, addBrand, getSingleBrand, getproductsByBrand } = require("../controllers/brand");
let tokenVerify = require('./../middlewares/tokenVerify');
router.get("/getallbrands", getAllBrands);
router.get("/getsinglebrand/:id", getSingleBrand);
router.get("/getproductbybrandid", getproductsByBrand);
router.post("/seller/addbrand", tokenVerify, addBrand)


module.exports = router;
