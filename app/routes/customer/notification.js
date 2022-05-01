let express = require("express");
let router = express.Router();
let { getNotification, markAsReadNotification, getTestnotifications, seenSingleNotification } = require('../../controllers/customer/notification')
let tokenVerify = require("../../middlewares/tokenVerify")

let { body} = require("express-validator");

router.post("/app/single/notification/mark", [

    body("notificationId").notEmpty().withMessage("Please enter a notificationId."),
], tokenVerify, seenSingleNotification)


router.get("/app/notification/test", getTestnotifications)

router.get("/app/getNotifications", tokenVerify, getNotification)
router.post("/app/markAsReadNotifications", tokenVerify, markAsReadNotification)

module.exports = router
