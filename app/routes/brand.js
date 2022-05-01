let express = require("express");
let router = express.Router();
let { body, query } = require("express-validator");
let { getAllBrands, getSingleBrand, getproductsByBrand } = require("../controllers/brand");

router.get("/app/getallbrands", getAllBrands);
router.get("/app/getsinglebrand/:id", getSingleBrand);
router.get("/app/getproductbybrandid", getproductsByBrand);

module.exports = router;
