const express = require('express');

const router = express.Router();
let { body, query } = require("express-validator");

/**********************************************CONTROLLER********************** */
const policy_controller = require('../controllers/policy')

/*************************************************END OF THE CONTROLLER************ */

/***********************************************************ROUTES******************* */

router.post("/policy",policy_controller.Post_Policy)

router.get('/policy',[
    query("type").notEmpty().withMessage("Please enter valid type"),
    // query("policyFor").notEmpty().withMessage("Please enter valid policy for detail"),
],policy_controller.Get_Policy)

router.get('/seller/policy',  [

    query("policyName").notEmpty().withMessage("Please enter policy name."),
    query("policyFor").notEmpty().withMessage("Please enter policyFor."),
],policy_controller.getPolicy)

/**********************************************************End of the Routes */


module.exports = router

