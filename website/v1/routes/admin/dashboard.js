let express = require("express");
let { body } = require("express-validator");
let router = express.Router();
const {
    adminDashboard, parentCategory
} = require('../../controllers/admin/dashboard/dashboard');


const verifyAdmin = require("../../middlewares/verifyAdmin");


router.post("/admin/dashboard", [
    // body("duration_type").notEmpty().withMessage("Please enter valid duration_type")
], verifyAdmin, adminDashboard)


router.get("/admin/dashboard/categories", parentCategory)

module.exports = router;