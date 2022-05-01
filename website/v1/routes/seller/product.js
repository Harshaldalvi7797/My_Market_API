let express = require("express");
let { body, query , check} = require("express-validator");
let router = express.Router();
let { addProduct, fetchSingleProduct, updateProduct, fetchProducts, deleteProduct , updateStatus,getAllcategoriesForproduct } = require("../../controllers/seller/product")
const tokenVerify = require('../../middlewares/tokenVerify');
const isSeller = require("../../middlewares/isSeller");
const bodyParser = require("body-parser");

// single product
router.get("/seller/singleproduct/:id",tokenVerify, fetchSingleProduct);

router.get("/seller/categories" ,getAllcategoriesForproduct)
router.post("/seller/addproduct", [
    check('productDetails').exists(),
    // check('productDetails.*.p_language').exists().isAlphanumeric().withMessage("Please enter a product language."),
    // check('productDetails.*.productName').exists().isAlphanumeric().withMessage("Please enter a product Name."),
    // check('productDetails.*.productDescription').exists().isAlphanumeric().withMessage("Please enter a  productDescription."),


    // body("productDetails").isArray().withMessage("Please enter a product Details."),
    // body("tags").notEmpty().withMessage("Please enter a product tags."),
    // body("groupTags").notEmpty().withMessage("Please enter a product groupTags."),
    body("brandId").notEmpty().isAlphanumeric().withMessage("Please Select Brand"),
    // body("productCategories").isArray().withMessage("Please Select  Categories"),
    // body("sellerId").isAlphanumeric().withMessage("Please enter valid seller Id"),
], tokenVerify, isSeller, addProduct)
router.get("/seller/fetchproducts", fetchProducts)
router.put("/seller/updateproduct/:id", tokenVerify, updateProduct)
router.delete("/seller/delete/:id", deleteProduct)

router.put("/seller/product/status/:id", tokenVerify, updateStatus)

module.exports = router;