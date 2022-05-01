let allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose");
const { validationResult } = require('express-validator');


exports.offerDeactivateCheck = async (req, res) => {
	// endDate > today
	const today = new Date();
	// today.setHours(0);
	// today.setMinutes(0);
	today.setSeconds(0);
	today.setMilliseconds(0);

	let datetime = convertDateTime(today);
	let adFilter = {
		'$and': [

			{ "endDateTime1": { $gte: datetime } },
			{ "adminApproval": true },
			{ "active": true },

		]
	}
	let advertiseoffer = await allModels.advertisementCampaign.aggregate([
		{ $match: { "whatToPromote.id": mongoose.Types.ObjectId(req.body.offerId) } },
		{ $match: adFilter }
	])

	let RESPONSE = { advertiseoffer: advertiseoffer }
	return res.send({ data: RESPONSE })

}

exports.addOfferprice = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	// console.log("Startdate=> " + new Date(req.body.startDateTime), new Date(req.body.startDateTime).toISOString());
	// console.log("Enddate=> " + new Date(req.body.endDateTime), new Date(req.body.endDateTime).toISOString());

	let offerPrice = new allModels.offerPricing({
		sellerId: req.userId,
		offerName: req.body.offerName,
		startDateTime: new Date(req.body.startDateTime),
		endDateTime: new Date(req.body.endDateTime),
		active: req.body.active
	})

	//notification for followers
	//	let customers= await allModels




	let data = await offerPrice.save()
	return res.send({ message: "Offer has been added.", d: data });
}

exports.getOfferprice = async (req, res, next) => {

	try {
		const { search, limit, page } = req.body;

		let perPage = parseInt(limit)
		let pageNo = Math.max(0, parseInt(page))

		if (pageNo > 0) {
			pageNo = pageNo - 1;
		} else if (pageNo < 0) {
			pageNo = 0;
		}

		const filter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			filter["$or"] = [
				{ "offerName": regexp },
			];
			if (parseFloat(search).toString() != "NaN") {

				filter["$or"].push({ "indexNo": parseFloat(search) })
			}
		}
		let totalCount = await allModels.offerPricing.countDocuments({
			"sellerId": mongoose.Types.ObjectId(req.userId),
			...filter
		});

		let offers = await allModels.offerPricing.find({
			"sellerId": mongoose.Types.ObjectId(req.userId),
			...filter
		}).sort({ "createdAt": "-1" })
			.limit(perPage)
			.skip(perPage * pageNo)

		return res.send({ totalCount: totalCount, pageNo: (pageNo + 1), data: offers });
	}
	catch (error) {
		return res.status(403).send({ message: error.message })
	}

}

exports.getSingleofferPrice = async (req, res) => {
	try {
		let offer = await allModels.offerPricing.findById(req.params.id)
		if (!offer) {
			return res.status(404).send({
				message: "There was no offer  found with given information!",
			});
		}
		return res.send({ offer });
	} catch (error) {
		return res.status(403).send({ message: error.message })
	}

}
const convertDateTime = (createdAt) => {
	let date = createdAt;
	let year = date.getFullYear();
	let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
	let day = ("0" + date.getDate()).slice(-2);
	return Number(`${year}${mnth}${day}`)
}

exports.updateOfferPrice = async (req, res) => {
	try {
		const offerPriceId = req.params.id;
		let offerprice = await allModels.offerPricing.findOne({ _id: offerPriceId });
		if (!offerprice)
			return res.status(404).send({
				message: "There was no offerprice found with given information!",
			});

		let today = new Date();
		let d1 = convertDateTime(today)
		if (d1 == offerprice.startDate) {
			return res.send({ message: "Offer Already Start!" })

		}
		let bodyData = req.body;

		if (bodyData.startDateTime) {
			bodyData.startDateTime = new Date(bodyData.startDateTime)
		}
		if (bodyData.endDateTime) {
			bodyData.endDateTime = new Date(bodyData.endDateTime)
		}
		const updateKeys = Object.keys(bodyData);
		updateKeys.forEach((update) => (offerprice[update] = bodyData[update]));
		await offerprice.save();
		return res.send({ message: "Offer has been updated.", offerprice });
	} catch (error) {
		return res.status(403).send({ message: error.message })
	}
}

exports.updateStatus = async (req, res) => {
	try {
		let offerprice = await allModels.offerPricing.findByIdAndUpdate(req.params.id);
		if (!offerprice) {
			return res.status(403).send({ message: "invalid id" });
		}
		offerprice.active = req.body.active
		offerprice.save()
		return res.send({ message: "Offer status has been updated" });
	}
	catch (error) {
		return res.status(403).send({ message: error.message })
	}
}

exports.updateMultipleOffersEndDate = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	let offers = await allModels.offerPricing.find({ "_id": req.body.offerPricingId, "sellerId": req.userId })

	for (let index = 0; index < offers.length; index++) {
		const element = offers[index];


		console.log(element._id)
		let update = { endDateTime: req.body.endDateTime }

		let updateEndDate = await allModels.offerPricing.updateMany({ "_id": element._id }, { $set: update })
	}
	return res.send({ message: "End Date has been updated" });


}

exports.multiStatusUpdateOffer = async (req, res) => {
	/* try {
		let offer = await allModels.offerPricing.find({ "_id": req.body.offerPricingId })
			.select(["_id"])

		for (let index = 0; index < offer.length; index++) {
			const element = offer[index];
			let update = { active: req.body.active }
			let updateStatus = await allModels.offerPricing.updateMany({ "_id": element._id }, { $set: update })
		}
		return res.send({ message: "Status has been updated." });
	}
	catch (error) {
		return res.status(403).send({ message: error.message })
	} */
	/* ========================================================================== */

	let { offerPricingId } = req.body;
	let offers = null;

	if (typeof offerPricingId == "string" && offerPricingId.toLowerCase() == "all") {
		offers = await allModels.offerPricing.find({ "sellerId": req.userId })
			.select(["_id"])
	} else if (typeof offerPricingId == "object") {
		offers = await allModels.offerPricing.find({ "_id": req.body.offerPricingId })
			.select(["_id"])
	}

	for (let index = 0; index < offers.length; index++) {
		const element = offers[index];
		let update = { active: req.body.active }
		let updateStatus = await allModels.offerPricing.updateMany({ "_id": element._id }, { $set: update })
	}

	return res.send({ message: "Status has been updated." });
}