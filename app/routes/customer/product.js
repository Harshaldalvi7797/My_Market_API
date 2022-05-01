let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();

/******************************************************CONTROLLER********************* */

const product = require('../../controllers/customer/product')
/**************************************************ROUTES **********************/

router.get('/app/home',product.fetchProduct_with_category)

module.exports=router