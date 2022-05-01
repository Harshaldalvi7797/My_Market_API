
const express = require('express');
let { body, query } = require("express-validator");
const router = express.Router();
/*********************************************CONTROLLERS******************* */
const manageAddressPost = require('../../controllers/customer/manageAddress')
/******************************************END OF THE CONTROLLER********** */
const tokenVerify = require("../../middlewares/tokenVerify");
const isCustomer = require("../../middlewares/isCustomer");

/*************************************************ROUTES***************** */
router.post('/manageaddress',
    [
        body("addressName").notEmpty().withMessage("Please enter a  addressName."),
        body("addressType").notEmpty().withMessage("Please enter a addressType."),
        body("addressLine1").notEmpty().withMessage("Please enter a addressLine1."),
        body("city").notEmpty().withMessage("Please enter a city."),
        body("country").notEmpty().withMessage("Please enter a country."),
    ], tokenVerify, isCustomer, manageAddressPost.manageAddressPost) //post data

router.patch('/manageaddress', tokenVerify, isCustomer, manageAddressPost.manageAddressPut) //put data

router.delete('/manageaddress/:id', tokenVerify, isCustomer, manageAddressPost.manageAddressDelete) //delete data

router.get('/manageaddress/:customerId', tokenVerify, isCustomer, manageAddressPost.manageAddressGet_customerId)

router.get('/manageaddressId/:id', tokenVerify, isCustomer, manageAddressPost.manageAddressIdGet)

/*************************************************End of the Routes********* */


module.exports = router;