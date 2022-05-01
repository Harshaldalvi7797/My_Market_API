let express = require("express");
let router = express.Router();
let { getNotification, markAsReadNotification, seenSingleNotification } = require("../controllers/notification")
let tokenVerify = require("../middlewares/tokenVerify")
let { body} = require("express-validator");
router.get("/getNotifications", tokenVerify, getNotification)
router.post("/markAsReadNotifications", tokenVerify, markAsReadNotification)

router.post("/single/notification/mark", [

    body("notificationId").notEmpty().withMessage("Please enter a notificationId."),
], tokenVerify, seenSingleNotification)

module.exports = router
