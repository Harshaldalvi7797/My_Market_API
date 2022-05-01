let express = require("express");
let router = express.Router();
const { getWhatTopromote ,getProductVarintsPromote ,getCategoryPromote,getProductPromote
,getBrandPromote ,newArrivalProductvarintsPromote, offersPromote
} = require('../../controllers/seller/whatToPromote');
const tokenVerify = require('../../middlewares/tokenVerify')
const isSeller = require('../../middlewares/isSeller')
router.get('/seller/advertisement/getwhatopromote', tokenVerify,isSeller, getWhatTopromote);

router.get('/seller/promote/productvariants', tokenVerify,isSeller,getProductVarintsPromote)

router.get('/seller/promote/categories', tokenVerify,isSeller, getCategoryPromote)

router.get('/seller/promote/products', tokenVerify,isSeller, getProductPromote)

router.get('/seller/promote/brands', tokenVerify,isSeller, getBrandPromote)

router.get('/seller/newarrival/promote' , tokenVerify, isSeller, newArrivalProductvarintsPromote)

router.get("/seller/promote/offers", tokenVerify, offersPromote)
module.exports = router;