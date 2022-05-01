let express = require("express");
let { body, query } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");
let router = express.Router();
let { addWishlist, getWishlist, removeWishlist, moveToCart } = require("../../controllers/customer/wishlist")
router.post('/app/wishlist/add-item', tokenVerify, isCustomer, addWishlist)
// router.post('/website/wishlist/add-item', async (req, res, next) => {
//     if (req.header('Authorization')) {
//         await tokenVerify(req, res, next);
//     } else {
//         next();
//     }
// }, addWishlist);
router.post('/app/wishlist/remove-item', tokenVerify, removeWishlist);
router.get('/app/wishlist/get-item', tokenVerify, getWishlist);
router.post('/app/wishlist-addcart', tokenVerify, moveToCart)
module.exports = router