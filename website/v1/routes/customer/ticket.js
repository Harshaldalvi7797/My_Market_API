const router = require("express").Router();
const { body } = require("express-validator");
const { createTicket } = require("../../controllers/customer/ticket");
const isCustomer = require("../../middlewares/isCustomer");
const tokenVerify = require("../../middlewares/tokenVerify");

router.post(
	"/customer/ticket",
	[
		body("subject")
			.notEmpty()
			.withMessage("Please enter subject for the ticket."),
		body("description")
			.notEmpty()
			.withMessage("Please enter the description for the ticket."),
	],
	tokenVerify,
	isCustomer,
	createTicket
);

module.exports = router;
