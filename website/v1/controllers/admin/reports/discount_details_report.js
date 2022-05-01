// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");

const discount_details_report = async (req, res) => {
	let { limit, page, search } = req.body;

	if (!limit) {
		limit = 10;
	}
	if (!page) {
		page = 1;
	}

	let perPage = parseInt(limit);
	let pageNo = Math.max(0, parseInt(page));

	if (pageNo > 0) {
		pageNo = pageNo - 1;
	} else if (pageNo < 0) {
		pageNo = 0;
	}

	try {
		let searchFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			searchFilter["$or"] = [
				{ "seller": regexp },
			];
			if (parseFloat(search) != NaN) {
				searchFilter["$or"].push({ discountByMyMarket: parseFloat(search) });
				searchFilter["$or"].push({ discountByMerchant: parseFloat(search) });
			}
		}

		// Fetching sale
		const details = await ALL_MODELS.orderItems.aggregate([
			{
				$lookup: {
					from: "offerpricingitems",
					localField: "offerPricingItemId",
					foreignField: "_id",
					as: "offeritem"
				}
			},
			{ $unwind: { path: "$offeritem", preserveNullAndEmptyArrays: true } },
			{
				$lookup: {
					from: "offerpricings",
					localField: "offeritem.offerpricingId",
					foreignField: "_id",
					as: "offer"
				}
			},
			{ $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
			// Seller
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller"
				}
			},
			{ $unwind: "$seller" },
			// Match
			{
				$project: {
					sellerId: 1,
					seller: "$seller.nameOfBussinessEnglish",
					// offer: 1,
					offerDiscount: 1,
					sellerOffer: {
						$cond: {
							if: {
								$and: [
									{ $ne: ["$offerDiscount", 0] },
									{ $ne: ["$offerDiscount", null] },
									{ $eq: ["$offer.adminId", null] },
								]
							}, then: '$offerDiscount', else: 0
						}
					},
					adminOffer: {
						$cond: {
							if: {
								$and: [

									{ $ne: ["$offerDiscount", 0] },
									{ $ne: ["$offerDiscount", null] },
									{ $ne: ["$offer.adminId", null] },
								]
							}, then: '$offerDiscount', else: 0
						}
					},
					couponDiscount: 1,
				},
			},
			{
				$group: {
					_id: "$sellerId",
					seller: { $first: "$seller" },
					discountByMyMarket: { $sum: { $add: ["$couponDiscount", "$adminOffer"] } },
					discountByMerchant: { $sum: "$sellerOffer" },
					// adminOffer: { $sum: "$adminOffer" },
					// sellerOffer: { $sum: "$sellerOffer" },
				}
			},
			{
				$addFields: {
					discountByMyMarket: { $round: ["$discountByMyMarket", 3] },
					discountByMerchant: { $round: ["$discountByMerchant", 3] }
				}
			},
			{ $sort: { _id: 1 } },
			{ $match: searchFilter },
			{
				$facet: {
					paginatedResults: [
						{
							$skip: perPage * pageNo,
						},
						{
							$limit: perPage,
						},
					],
					totalCount: [
						{
							$count: "count",
						},
					],
				},
			},
		]);
		let totalCount = 0;
		try {
			totalCount = details[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: details.length ? details[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};



module.exports = { discount_details_report };
