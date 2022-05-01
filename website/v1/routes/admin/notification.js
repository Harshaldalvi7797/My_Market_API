// core modules
const path = require("path");

// Third party modules
const express = require("express");
const { body } = require("express-validator");

const router = express.Router();


// middleware
const verifyAdmin = require(path.join(__dirname, "..", "..", "middlewares", "verifyAdmin"));
const data_validity_middleware = require(path.join(__dirname, "..", "..", "middlewares", "data_validity_middleware"));

// controller
const {
	insert_notification,
	fetch_notification,
	update_notification,
	delete_notification,
} = require("../../controllers/admin/notification");




router.post("/admin/notification", verifyAdmin, 
[
	body("notificationType", "Notification type is required.").notEmpty(),
	body("notificationNameEnglish", "Notification english name is required.").notEmpty(),
	body("notificationNameArabic", "Notification arabic name is required.").notEmpty(),	
	body("notificationReceiveOn", "Notification receive on is required.").notEmpty(),
	body("notificationType", "Notification type is required.").notEmpty(),
],
data_validity_middleware, insert_notification);

router.get("/admin/notification", verifyAdmin, fetch_notification);

router.patch("/admin/notification", 
verifyAdmin,
[
	body("_id", "Banner id is required.").notEmpty(),
],
data_validity_middleware, update_notification
);

router.delete("/admin/notification/:_id", verifyAdmin, delete_notification);


module.exports = router;
