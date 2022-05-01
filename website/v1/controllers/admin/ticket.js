const ALL_MODELS = require("../../../../utilities/allModels");

getTickets = async (req, res) => {
	try {
		const tickets = await ALL_MODELS.ticketModel.aggregate([
			{
				$facet: {
					result: [
						{
							$skip:
								!req.query.skip || req.query.skip == 0
									? 0
									: parseInt(req.query.skip),
						},
						{
							$limit:
								!req.query.limit || req.query.limit == 0
									? 5
									: parseInt(req.query.limit),
						},
					],
					totalCount: [{ $count: "totalCount" }],
				},
			},
		]);

		return res.send({
			tickets: tickets[0].result,
			count: tickets[0].result.length,
			totalCount: tickets[0].totalCount[0].totalCount,
		});
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

updateTicket = async (req, res) => {
	try {
		const ticketId = req.params.id;
		let ticket = await ALL_MODELS.ticketModel.findOne({ _id: ticketId });
		if (!ticket)
			return res
				.status(404)
				.send({ message: "There was no ticket found with given information!" });

		const updateKeys = Object.keys(req.body);
		updateKeys.forEach((update) => (ticket[update] = req.body[update]));
		await ticket.save();
		return res.send({ message: "Ticket has been updated.", ticket });
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error!",
			systemErrorMessage: error.message,
		});
	}
};

deleteTicket = async (req, res) => {
	try {
		const ticketId = req.params.id;
		let ticket = await ALL_MODELS.ticketModel.findOneAndRemove({
			_id: ticketId,
		});
		if (!ticket)
			return res
				.status(404)
				.send({ message: "There was no ticket found with given information!" });
		res.send({ message: "Ticket has been deleted.", ticket });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error!",
			systemErrorMessage: error.message,
		});
	}
};

module.exports = {
	getTickets,
	updateTicket,
	deleteTicket,
};
