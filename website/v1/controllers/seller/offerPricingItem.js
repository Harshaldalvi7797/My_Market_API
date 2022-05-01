let allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose");
const { validationResult } = require('express-validator');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.addOfferpricingItem = async (req, res) => {
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
						sellerId: req.userId,
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
						let offerPriceAmount

						if (discountType == "flat") {
							offerPrice = productvariant.productNetPrice - discountValue
							offerPriceAmount = productvariant.productNetPrice - offerPrice
						}

						if (discountType == "percentage") {
							offerPriceAmount = (discountValue / 100) * productvariant.productNetPrice;
							offerPrice = productvariant.productNetPrice - offerPriceAmount

							offerPriceAmount = productvariant.productNetPrice - offerPrice
							// discountPrice =  productvariant.productNetPrice - discountValue
						}

						let lastIndex = await allModels.offerPricingItem.findOne().sort([['indexNo', '-1']]);
						if (!lastIndex) { lastIndex = {}; lastIndex['indexNo'] = 1000 }

						let offerPriceItem = new allModels.offerPricingItem({
							offerpricingId: offerpricingId,
							productVariantId: productVariantId,
							discountType: discountType,
							discountValue: discountValue,
							offerPrice: offerPrice,
							offerPriceAmount: offerPriceAmount,
							indexNo: lastIndex.indexNo + 1
						})
						// console.log(JSON.stringify(offerPriceItem))

						let data = await offerPriceItem.save()

						//send notification
						let offerItemLength = await allModels.offerPricingItem.find({ offerpricingId: offerpricingId })
							.populate([{ path: "offerpricingId" }])
						// console.log("offerItemLength", offerItemLength.length)
						if (offerItemLength.length == 1) {
							// console.log("send notification");

							// console.log("offerItemLength", offerItemLength)
							for (let index = 0; index < offerItemLength.length; index++) {
								const element = offerItemLength[index];
								// console.log("element", element)
								let followers = await allModels.customer_seller_follow.find({ "sellerId": element.offerpricingId.sellerId })
									.select(["customerId"]);

								for (let i = 0; i < followers.length; i++) {
									const ele = followers[i];
									//	console.log("ele", ele)
									await sendNotification(req, req.userId, ele.customerId, '16', element, 'Any new post in Offers & sales', element.productVariantId)
								}
								// await sendNotification(req, req.userId, followers.customerId, '16', 'Any new post in Offers & sales', element.productVariantId)
								// return res.send({ message: "followers", d: followers });
							}



						}

						RESPONSE.push(data);
					}
				}
				catch (error) {
					RESPONSE.push({ error: error.message, productVariantId: element.productVariantId });
					//return res.status(403).send({ message: error.message });
				}
			}
			return res.send({ message: "Item has been added to offer.", d: RESPONSE });
		} else {
			return res.status(403).send({ message: "Invalid data provided" })
		}

	} catch (err) {
		return res.status(403).send({ message: err.message })
	}
}

exports.getofferpricingitem = async (req, res) => {
	try {
		const today = new Date();

		const startDate = new Date(req.query.startDate);
		const endDate = new Date(req.query.endDate);

		//console.log(req.userId);

		if (endDate < today) {
			return res.status(403).send({ message: 'end date must be greater/equal to today date', data: [], count: 0 });
		}

		const producutVariant = await allModels.productVariant.aggregate([
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
						{ "sellerId": mongoose.Types.ObjectId(req.userId) },
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

exports.getItemsBasedOnOfferPricingId = async (req, res) => {
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
			.populate({ path: "productVariantId", select: ["productVariantDetails.productVariantName", "productGrossPrice", "productNetPrice", "indexNo"] })
			.select(["-__v", "-updatedAt", "-password"])
			.limit(perPage)
			.skip(perPage * pageNo)

		let totalCount = await allModels.offerPricingItem
			.countDocuments({ "offerpricingId": offerpricingId });
		return res.send({ totalCount, offerPricingItem });
	} catch (error) {
		return res.status(403).send({
			message: error.message,
		});
	}

}

exports.singleOfferpricingItem = async (req, res) => {
	try {
		let offerPricingItem = await allModels.offerPricingItem.findById(req.params.id)
		if (!offerPricingItem) {
			return res.status(404).send({
				message: "There was no offerPricingItem  found with given information!",
			});
		}
		return res.send({ offerPricingItem });
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
}

exports.updateofferPricingitem = async (req, res) => {
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
		return res.send({ message: "Item has been added to offer", offerPricingItem });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}

}

exports.deleteOfferpricingItem = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	let pv = await allModels.productVariant.findOne({ _id: req.params.productVariantId, sellerId: req.userId });
	if (!pv) {
		return res.send({ message: "Invalid product variant" });
	}

	try {
		await allModels.offerPricingItem.findOneAndRemove({ _id: req.params.id, productVariantId: pv._id });
		return res.send({ message: 'Item deleted successfully' });
	} catch (error) {
		return res.status(500).send({
			message: error.message
		});
	}
}

exports.statusUpdateOfferpricingItem = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	try {
		let pv = await allModels.productVariant.findOne({ "_id": req.body.productVariantId, sellerId: req.userId });
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