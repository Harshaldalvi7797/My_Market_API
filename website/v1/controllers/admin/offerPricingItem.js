const mongoose = require("mongoose");
var XLSX = require('xlsx');
const { validationResult } = require('express-validator');

const allModels = require("../../../../utilities/allModels");

exports.adminAddOfferpricingItem = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	try {
		let data = req.body;
		let RESPONSE = [];
		if (data.length) {
			for (let index = 0; index < data.length; index++) {
				const element = data[index];
				try {
					const today = new Date();
					let offerpricing = await allModels.offerPricing.findOne({
						_id: element.offerpricingId,
						endDateTime: { $gt: today }
					}).select(['-__v', '-createdAt', '-updatedAt']);
					// console.log(offerpricing)
					if (!offerpricing) {
						return res.status(403).send({ message: "Invalid/Expired offer selected" });
					}

					let { offerpricingId, productVariantId, discountType, discountValue } = element;

					let productvariant = await allModels.productVariant.findOne({ "_id": productVariantId })
						.select(["productNetPrice"]);

					if (!productvariant) {
						RESPONSE.push({ error: "There was no product found with given information!", productVariantId: productVariantId });
					} else {

						let offerPrice

						if (discountType == "flat") {
							offerPrice = productvariant.productNetPrice - discountValue
							offerPriceAmount = productvariant.productNetPrice - offerPrice
						}

						if (discountType == "percentage") {
							offerPriceA = (discountValue / 100) * productvariant.productNetPrice;
							offerPrice = productvariant.productNetPrice - offerPriceA

							offerPriceAmount = productvariant.productNetPrice - offerPrice
							// discountPrice =  productvariant.productNetPrice - discountValue
						}

						let offerPriceItem = new allModels.offerPricingItem({
							offerpricingId: offerpricingId,
							productVariantId: productVariantId,
							discountType: discountType,
							discountValue: discountValue,
							offerPrice: offerPrice,
							offerPriceAmount: offerPriceAmount
						})

						let data = await offerPriceItem.save()
						RESPONSE.push(data);
					}
				}
				catch (error) {
					RESPONSE.push({ error: error.message, productVariantId: element.productVariantId });
					//return res.status(403).send({ message: error.message });
				}
			}
			return res.send({ message: "Item has been added to offer", d: RESPONSE });
		} else {
			return res.status(403).send({ message: "Invalid data provided" })
		}

	} catch (err) {
		return res.status(403).send({ message: err.message })
	}
}

exports.adminGetofferpricingitem = async (req, res) => {
	try {
		const validationError = validationResult(req);
		if (!validationError.isEmpty()) {
			return res.status(403).send({ message: validationError.array() });
		}

		const today = new Date();

		const startDate = new Date(req.query.startDate);
		const endDate = new Date(req.query.endDate);
		let seller = mongoose.Types.ObjectId(req.query.sellerId);
		//console.log(req.userId);

		/* if (startDate < today) {
			return res.status(403).send({ message: 'start date must be greater or equal to today date', data: [], count: 0 });
		}
		else */ if (endDate < today) {
			return res.status(403).send({ message: 'end date must be greater/equal to today date', data: [], count: 0 });
		}

		const producutVariant = await allModels.productVariant.aggregate([
			{ $match: { sellerId: seller } },
			{
				$lookup: {
					from: "offerpricingitems",
					localField: "_id",
					foreignField: "productVariantId",
					as: "offerPriceItem"
				}
			},
			{
				$lookup: {
					from: "offerpricings",
					localField: "offerPriceItem.offerpricingId",
					foreignField: "_id",
					as: "offerPrice"
				}
			},
			{
				$match: {
					$and: [
						{
							$or: [
								{ offerPrice: [] },
								{ offerPrice: null },
								{
									$and: [
										{ 'offerPrice.startDateTime': { $lt: today } },
										{ 'offerPrice.endDateTime': { $lt: today } },
									],
								},
								{
									$and: [
										{ 'offerPrice.startDateTime': { $lt: today } },
										{ 'offerPrice.endDateTime': { $gt: today, $lt: startDate } }
									],
								},
								{
									$and: [
										{ 'offerPrice.startDateTime': { $lt: startDate } },
										{ 'offerPrice.endDateTime': { $lt: startDate } }
									],
								},
								{
									$and: [
										{ 'offerPrice.startDateTime': { $gt: endDate } },
										{ 'offerPrice.endDateTime': { $gt: endDate } }
									],
								}
							]
						}
					]
				}
			},
			{
				$project: {
					productNetPrice: 1,
					offerPrice: 1,
					productVariantNames: {
						$map: {
							input: "$productVariantDetails",
							as: "productVariantDetail",
							in: "$$productVariantDetail.productVariantName"
						}
					}
				}
			}
		]);

		let RESPONSE = [];

		for (let index = 0; index < producutVariant.length; index++) {
			const ele = producutVariant[index];

			if (ele.offerPrice && ele.offerPrice.length > 0) {
				let filter = ele.offerPrice.filter(f => {
					let start = new Date(f.startDateTime);
					let end = new Date(f.endDateTime);
					return start.toUTCString() == startDate.toUTCString() && end.toUTCString() == endDate.toUTCString()
				});
				if (filter.length == 0) {
					RESPONSE.push(ele);
				}
			} else {
				RESPONSE.push(ele);
			}
		}

		return res.json({
			count: RESPONSE.length,
			data: RESPONSE
		});

	} catch (error) {
		return res.status(403).send({ message: error.message });
	}

}

exports.adminGetItemsBasedOnOfferPricingId = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	try {
		let offerpricingId = req.query.offerpricingId

		var valid = mongoose.Types.ObjectId.isValid(offerpricingId);
		if (!valid) {
			return res.status(402).send({ message: "Invalid Offer Pricing Id" });
		}
		const { limit, page } = req.query;
		let perPage = parseInt(limit)
		let pageNo = Math.max(0, parseInt(page))

		if (pageNo > 0) {
			pageNo = pageNo - 1;
		} else if (pageNo < 0) {
			pageNo = 0;
		}

		let offerPricingItem = await allModels.offerPricingItem
			.find({ "offerpricingId": offerpricingId })
			.populate({ path: "productVariantId", select: ["productVariantDetails.productVariantName", "productGrossPrice", "productNetPrice"] })
			.select(["-__v", "-updatedAt", "-password"])
			.limit(perPage)
			.skip(perPage * pageNo)

		let totalCount = await allModels.offerPricingItem
			.countDocuments({ "offerpricingId": offerpricingId });
		return res.send({ totalCount, offerPricingItem });
	} catch (error) {
		return res.status(500).send({
			message: error.message,
		});
	}

}

exports.adminStatusUpdateOfferpricingItem = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	try {
		let pv = await allModels.productVariant.findOne({ "_id": req.body.productVariantId });
		if (!pv) {
			return res.send({ message: "There was no product found with given information!" });
		}

		let offerPricingItem = await allModels.offerPricingItem.findOne({ "_id": req.body.offerPricingItemId, "productVariantId": req.body.productVariantId })
		if (!offerPricingItem) {
			return res.send({ message: "There was no offerPricingItem found with given information!" });
		}

		offerPricingItem.active = req.body.active
		offerPricingItem.save()
		return res.send({ message: "Offer Item has been updated." });
	}
	catch (error) {
		return error

	}
}

exports.adminUpdateofferPricingitem = async (req, res) => {
	try {
		const validationError = validationResult(req);
		if (!validationError.isEmpty()) {
			return res.status(403).send({ message: validationError.array() });
		}
		const offerPriceItemId = req.params.id;
		let offerPricingItem = await allModels.offerPricingItem.findOne({ _id: offerPriceItemId });
		if (!offerPricingItem)
			return res.status(404).send({
				message: "There was no offerPricingItem found with given information!",
			});
		const updateKeys = Object.keys(req.body);
		updateKeys.forEach((update) => (offerPricingItem[update] = req.body[update]));
		await offerPricingItem.save();
		return res.send({ message: "Offer Item has been updated.", offerPricingItem });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}

}