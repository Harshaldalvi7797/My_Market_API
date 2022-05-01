const { validationResult } = require("express-validator");
const Ticket = require("../../../../models/ticket");

createTicket = async (req, res) => {
	try {
		const validationError = validationResult(req);
		if (!validationError.isEmpty()) {
			return res.status(403).send({ message: validationError.array() });
		}
		const ticket = new Ticket(req.body);
		ticket.save();
		res.send({ message: "New ticket has been created.", ticket });
	} catch (error) {
		res
			.status(500)
			.send({
				message: "Internal server error :(",
				systemErrorMessage: error.message,
			});
	}
};

module.exports = {
	createTicket,
};
