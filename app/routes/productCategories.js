
const express = require('express');
const { getProduct, ParticularProduct } = require("./../controllers/productCategories");
const router = express.Router();



router.get('/app/categoryProduct', getProduct)


router.get('/app/categoryProduct/:id', ParticularProduct)


module.exports = router;