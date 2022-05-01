const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const ticketSchema = new mongoose.Schema(
	{
		subject: String,
		description: String,
		customerId: { type: ObjectId, ref: "customers" },
		priority: {
			type: String,
			enum: ["low", "normal", "medium", "high", "critical"],
			default: "low",
		},
		status: {
			type: String,
			enum: ["open", "inprocess", "closed"],
			default: "open",
		},
	},
	{
		timestamps: true,
	}
);

const Ticket = new mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
