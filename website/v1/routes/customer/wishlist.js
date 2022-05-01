let express = require("express");
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let router = express.Router();
let { addWishlist, getWishlist, removeWishlist, moveToCart } = require("../../controllers/customer/wishlist")

router.post('/website/wishlist/add-item', tokenVerify, isCustomer, addWishlist)
// router.post('/website/wishlist/add-item', async (req, res, next) => {
//     if (req.header('Authorization')) {
//         await tokenVerify(req, res, next);
//     } else {
//         next();
//     }
// }, addWishlist);
router.post('/website/wishlist/remove-item', tokenVerify, isCustomer, removeWishlist);
router.get('/website/wishlist/get-item', tokenVerify, isCustomer, getWishlist);
router.post('/website/wishlist-addcart', tokenVerify, isCustomer, moveToCart)

module.exports = router