
const express = require('express');
const { getProduct, ParticularProduct } = require("./../controllers/productCategories");
const router = express.Router();



router.get('/categoryProduct', getProduct)


router.get('/categoryProduct/:id', ParticularProduct)


module.exports = router;