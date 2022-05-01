const path = require("path");


// Third party modules
const express = require('express');

const router = new express.Router();

// Middlewares
const  tokenVerify = require("../middlewares/tokenVerify");


 /*********************************************CONTROLLERS******************* */
 const  manageAddressPost = require('../controllers/manageAddress');
 /******************************************END OF THE CONTROLLER********** */


/*************************************************ROUTES***************** */
router.post('/app/manageaddress', manageAddressPost.manageAddressPost) //post data

router.patch('/app/manageaddress',manageAddressPost.manageAddressPut) //put data

router.delete('/app/manageaddress/:id',manageAddressPost.manageAddressDelete) //delete data

router.get('/app/manageaddress',tokenVerify,manageAddressPost.getCustomerAddress);

/*************************************************End of the Routes********* */


module.exports = router;