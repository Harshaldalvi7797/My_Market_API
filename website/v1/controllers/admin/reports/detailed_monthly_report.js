// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");

const convertDateTime = (createdAt) => {
	let date = createdAt;
	let year = date.getFullYear();
	let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
	let day = ("0" + date.getDate()).slice(-2);
	let hr = ("0" + date.getHours()).slice(-2);
	let min = ("0" + date.getMinutes()).slice(-2);
	let sec = ("0" + date.getSeconds()).slice(-2);

	// this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
	return Number(`${year}${mnth}${day}${hr}${min}${sec}`);
};

const lastDateOfMonth = (y, m) => {
	return new Date(y, m + 1, 0).getDate();
}

const detailed_monthly_report = async (req, res, next) => {
	let { limit, page, month, year } = req.body;

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
		let currentDate = new Date();
		let endDate = new Date();
		let startDate = new Date();

		if (month != undefined) {
			endDate.setMonth(parseInt(month.toString()));
			startDate.setMonth(parseInt(month.toString()));
		}
		if (year != undefined) {
			endDate.setFullYear(year);
			startDate.setFullYear(year);
		}

		startDate.setDate(1);
		startDate.setHours(0);
		startDate.setMinutes(0);

		if (currentDate.getMonth() == endDate.getMonth()) {
			endDate.setHours(0);
			endDate.setMinutes(0);
		} else {
			let lastDate = lastDateOfMonth(endDate.getFullYear(), endDate.getMonth());
			endDate.setDate(lastDate);
			endDate.setHours(0);
			endDate.setMinutes(0);
		}

		let dateFilter = {
			$and: [
				{ "order.createdDate": { $gte: convertDateTime(startDate) } },
				{ "order.createdDate": { $lte: convertDateTime(endDate) } }
			]
		}

		// console.log(JSON.stringify(dateFilter))

		// Fetching sale
		const sales = await ALL_MODELS.orderItems.aggregate([
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{ $unwind: "$order" },
			{ $match: dateFilter },
			{
				$lookup: {
					from: "ordershippings",
					let: { sellerId: "$sellerId", orderId: "$orderId" },
					pipeline: [{
						$match: {
							$expr: {
								$and: [
									{ $eq: ["$$sellerId", "$sellerId"] },
									{ $eq: ["$$orderId", "$orderId"] }
								]
							}
						}
					}],
					as: "ordershipping",
				},
			},
			{ $unwind: "$ordershipping" },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershipping._id",
					foreignField: "orderShippingId",
					as: "orderstatusupdate",
				},
			},
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
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
			{
				$lookup: {
					from: "sellers",
					localField: "productvariants.sellerId",
					foreignField: "_id",
					as: "seller"
				}
			},
			{ $unwind: "$seller" },
			{
				$lookup: {
					from: "products",
					localField: "productvariants.productId",
					foreignField: "_id",
					as: "product"
				}
			},
			{ $unwind: "$product" },
			{
				$lookup: {
					from: "categories",
					localField: "product.productCategories.categoryLevel1Id",
					foreignField: "_id",
					as: "categoriesName",
				},
			},
			{
				$addFields: {
					NateSales: {
						$subtract: [{ $multiply: [{ $toDouble: "$retailPrice" }, "$quantity"] }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }]
					}
				}
			},
			{
				$addFields: {
					VatAmount: {
						$multiply: ["$NateSales", { $divide: [{ $toDouble: "$productvariants.productTaxPercentage" }, 100] }]
					}
				}
			},
			{
				$project: {
					createdDate: 1,
					createdAt: 1,
					orderDate: "$order.createdAt",
					orderId: "$order._id",
					orderIndexNo: "$order.indexNo",
					orderStatus: { $last: "$orderstatusupdate.status" },
					productVariantName: "$productVariantDetails",
					category: { $first: "$categoriesName.categoryDetails" },
					seller: "$seller.nameOfBussinessEnglish",

					quantity: 1,
					discounts: {
						offerPrice: "$offerPrice",
						offerName: "$offer.offerName",
						// offerPercent: "$offer.offerName",
						offerDiscount: "$offerDiscount",
						couponCode: "$couponCode",
						couponDiscount: "$couponDiscount",
						totalDiscount: "$totalDiscount",
					},
					RefundedAmount: 1,
					RefundedTaxAmount: 1,

					productNetPrice: { $toDouble: "$retailPrice" },
					grandTotal: { $toDouble: "$grandTotal" },
					NateSales: 1,
					VATPercentage: { $toDouble: "$productvariants.productTaxPercentage" },
					VatAmount: 1,
					GrossSale: { $subtract: ["$NateSales", "$VatAmount"] },
					RefundedTaxAmount: {
						$multiply: [
							{ $toDouble: "$RefundedAmount" },
							{ $divide: [{ $toDouble: "$productvariants.productTaxPercentage" }, 100] }
						]
					},
					totalAmount: { $add: ["$NateSales", "$VatAmount"] },
					paymentType: "$order.paymentMethod",
				},

			},
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

		const salesList = sales.length ? sales[0].paginatedResults : [];
		let totalCount = 0;
		try {
			totalCount = sales[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: salesList,
			count: salesList.length,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of detailed_monthly_report

module.exports = detailed_monthly_report;
