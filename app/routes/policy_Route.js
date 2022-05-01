const express = require('express');

const router = express.Router();
let { body, query } = require("express-validator");

/**********************************************CONTROLLER********************** */
const policy_controller = require('../controllers/policy')

/*************************************************END OF THE CONTROLLER************ */

/***********************************************************ROUTES******************* */

router.get('/app/details',[
      query("type").notEmpty().withMessage("Please enter valid type"),
      // query("policyFor").notEmpty().withMessage("Please enter valid policy for detail"),
],policy_controller.Get_Policy)

/**********************************************************End of the Routes */


module.exports = router

