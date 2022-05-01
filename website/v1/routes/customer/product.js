let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();

/******************************************************CONTROLLER********************* */

const product = require('../../controllers/customer/product')
/**************************************************ROUTES **********************/

router.get('/home',product.fetchProduct_with_category)

module.exports=router