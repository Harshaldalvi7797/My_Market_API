const express = require('express');
const router = express.Router()

const tokenVerify = require('../../middlewares/tokenVerify');


const { 
    getOffers
} = require("../../controllers/customer/offer")

router.get('/app/offer', getOffers)



module.exports = router;