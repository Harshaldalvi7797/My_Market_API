// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('../../../middlewares/checkCreateFolder');

const completed_offer_report = async (req, res, next) => {
	let { start_date, end_date, search, product_variant, category_id,
		percent_start, percent_end, limit, page } = req.body;

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
		// Filter
		let filter = {};
		let dateFilter = { $and: [] };

		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "offerName": regexp },
				{ "productVariant.productVariantName": regexp },
				{ "categoryLevel1.categoryName": regexp },
			];

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				Searchfilter["$or"].push({ "offerIndexNo": parseFloat(search) });
				Searchfilter["$or"].push({ "quantitySold": parseFloat(search) });
				Searchfilter["$or"].push({ "offerDiscountAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "couponDiscountAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "productVariantNetPrice": parseFloat(search) });
				Searchfilter["$or"].push({ "grossSale": parseFloat(search) });
				Searchfilter["$or"].push({ "totalDiscountAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "totalAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "averageDiscountPercentage": parseFloat(search) });
			}
		}

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		defaultDate.setDate(defaultDate.getDate() - 120);

		if (product_variant || category_id || (percent_start && parseFloat(percent_start.toString()).toString().toLowerCase() != 'nan') || (percent_end && parseFloat(percent_end.toString()).toString().toLowerCase() != 'nan')) {
			filter["$and"] = [];
		}

		if (product_variant && typeof product_variant == 'object') {
			product_variant = product_variant.map(m => ObjectId(m))
			filter["$and"].push({ "productVariantId": { $in: product_variant } });
		}

		if (category_id && typeof category_id == 'object') {
			category_id = category_id.map(m => ObjectId(m))
			filter["$and"].push({ "categoryLevel1Id": { $in: category_id } });
		}

		if (percent_start && parseFloat(percent_start.toString()).toString().toLowerCase() != 'nan') {
			percent_start = parseFloat(percent_start.toString());
			filter['$and'].push({ "percentageOfOffer": { $gte: percent_start } });
		}

		if (percent_end && parseFloat(percent_end.toString()).toString().toLowerCase() != 'nan') {
			percent_end = parseFloat(percent_end.toString());
			filter['$and'].push({ "percentageOfOffer": { $lte: percent_end } });
		}

		if (start_date) {
			start_date = new Date(start_date);
			start_date.setHours(0);
			start_date.setMinutes(0);
			start_date.setSeconds(0);
			let dt = convertDateTime(start_date);
			dateFilter["$and"].push({ 'orders.createdDate': { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			let dt = convertDateTime(end_date);
			dateFilter["$and"].push({ 'orders.createdDate': { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			dateFilter["$and"].push({ 'orders.createdDate': { $gte: dt } });
		}

		//console.log(JSON.stringify(filter));
		// Fetching sale
		const offer = await ALL_MODELS.orderItems.aggregate([
			// lookup order
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "orders",
				},
			},
			{ $unwind: "$orders" },
			//Date range filter
			{ $match: dateFilter },
			// lookup productvariants
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "pv",
				},
			},
			// lookup product
			{
				$lookup: {
					from: "products",
					localField: "pv.productId",
					foreignField: "_id",
					as: "product",
				},
			},
			{ $unwind: "$product" },
			// lookup product
			{
				$lookup: {
					from: "categories",
					localField: "product.productCategories.categoryLevel1Id",
					foreignField: "_id",
					as: "categoryLevel1",
				},
			},
			{ $unwind: "$categoryLevel1" },
			//lookup offerpricingitems
			{
				$lookup: {
					from: "offerpricingitems",
					localField: "offerPricingItemId",
					foreignField: "_id",
					as: "offerpricingitems",
				},
			},
			//lookup offerpricings
			{
				$lookup: {
					from: "offerpricings",
					localField: "offerpricingitems.offerpricingId",
					foreignField: "_id",
					as: "offerpricings",
				},
			},
			{ $unwind: "$pv" },
			{ $unwind: "$offerpricingitems" },
			{ $unwind: "$offerpricings" },
			//project
			{
				$project: {
					_id: "$offerpricingitems._id",
					offerIndexNo: "$offerpricings.indexNo",
					offerName: "$offerpricings.offerName",
					offerStatus: "$offerpricings.active",
					productVariantId: "$pv._id",
					productVariant: "$pv.productVariantDetails",
					categoryLevel1Id: "$categoryLevel1._id",
					categoryLevel1: "$categoryLevel1.categoryDetails",

					qtySold: "$quantity",
					offerDiscountAmount: { $multiply: ["$offerDiscount", "$quantity"] },
					pvNetPrice: "$retailPrice",
					couponDiscountAmount: "$couponDiscount",
					percentageOfOffer: { $round: [{ $multiply: [{ $divide: ["$offerDiscount", "$retailPrice"] }, 100] }, 2] },
					offerPrice: {
						discountType: "$offerpricingitems.discountType",
						discountValue: "$offerpricingitems.discountValue",
						offerPrice: "$offerpricingitems.offerPrice"
					}
				}
			},
			//group
			{
				$group: {
					_id: "$_id",
					offerIndexNo: { $first: "$offerIndexNo" },
					offerName: { $first: "$offerName" },
					productVariantId: { $first: "$productVariantId" },
					productVariant: { $first: "$productVariant" },
					categoryLevel1Id: { $first: "$categoryLevel1Id" },
					categoryLevel1: { $first: "$categoryLevel1" },
					offerStatus: { $first: "$offerStatus" },

					percentageOfOffer: { $first: "$percentageOfOffer" },
					quantitySold: { $sum: "$qtySold" },
					offerDiscountAmount: { $sum: "$offerDiscountAmount" },
					couponDiscountAmount: { $sum: "$couponDiscountAmount" },
					productVariantNetPrice: { $first: "$pvNetPrice" }

				}
			},
			//project
			{
				$project: {
					offerIndexNo: 1,
					offerName: 1,
					productVariantId: 1,
					productVariant: 1,
					categoryLevel1Id: 1,
					categoryLevel1: 1,
					quantitySold: 1,
					offerStatus: 1,
					//offerDiscountAmount: 1,
					percentageOfOffer: 1,
					//couponDiscountAmount: 1,
					//productVariantNetPrice: 1,
					//grossSale: { $multiply: ["$productVariantNetPrice", "$quantitySold"] },
					totalDiscountAmount: { $add: ["$offerDiscountAmount", "$couponDiscountAmount"] },
					totalAmount: { $subtract: [{ $multiply: ["$productVariantNetPrice", "$quantitySold"] }, { $add: ["$offerDiscountAmount", "$couponDiscountAmount"] }] },
					//averageDiscountPercentage: { $multiply: [{ $divide: [{ $add: ["$offerDiscountAmount", "$couponDiscountAmount"] }, { $subtract: [{ $multiply: ["$productVariantNetPrice", "$quantitySold"] }, { $add: ["$offerDiscountAmount", "$couponDiscountAmount"] }] }] }, 100] }
				}
			},
			{
				$project: {
					"productVariant.productVariantDescription": 0,
					"productVariant.productSpecification": 0,
				}
			},
			// Match
			// { $match: filter },
			{ $match: Searchfilter },
			{ $match: filter },
			{ $sort: { offerIndexNo: -1 } },
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
			totalCount = offer[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			count: offer[0].paginatedResults.length,
			data: offer.length ? offer[0].paginatedResults : []
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of offer_report

const completed_offer_report_excel = async (req, res, next) => {
	let { start_date, end_date, search, product_variant, category_id,
		percent_start, percent_end } = req.body;


	try {
		// Filter
		let filter = {};
		let dateFilter = { $and: [] };

		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "offerName": regexp },
				{ "productVariant.productVariantName": regexp },
				{ "categoryLevel1.categoryName": regexp },
			];

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				Searchfilter["$or"].push({ "offerIndexNo": parseFloat(search) });
				Searchfilter["$or"].push({ "quantitySold": parseFloat(search) });
				Searchfilter["$or"].push({ "offerDiscountAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "couponDiscountAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "productVariantNetPrice": parseFloat(search) });
				Searchfilter["$or"].push({ "grossSale": parseFloat(search) });
				Searchfilter["$or"].push({ "totalDiscountAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "totalAmount": parseFloat(search) });
				Searchfilter["$or"].push({ "averageDiscountPercentage": parseFloat(search) });
			}
		}

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		defaultDate.setDate(defaultDate.getDate() - 120);

		if (product_variant || category_id || (percent_start && parseFloat(percent_start.toString()).toString().toLowerCase() != 'nan') || (percent_end && parseFloat(percent_end.toString()).toString().toLowerCase() != 'nan')) {
			filter["$and"] = [];
		}

		if (product_variant && typeof product_variant == 'object') {
			product_variant = product_variant.map(m => ObjectId(m))
			filter["$and"].push({ "productVariantId": { $in: product_variant } });
		}

		if (category_id && typeof category_id == 'object') {
			category_id = category_id.map(m => ObjectId(m))
			filter["$and"].push({ "categoryLevel1Id": { $in: category_id } });
		}

		if (percent_start && parseFloat(percent_start.toString()).toString().toLowerCase() != 'nan') {
			percent_start = parseFloat(percent_start.toString());
			filter['$and'].push({ "percentageOfOffer": { $gte: percent_start } });
		}

		if (percent_end && parseFloat(percent_end.toString()).toString().toLowerCase() != 'nan') {
			percent_end = parseFloat(percent_end.toString());
			filter['$and'].push({ "percentageOfOffer": { $lte: percent_end } });
		}

		if (start_date) {
			start_date = new Date(start_date);
			start_date.setHours(0);
			start_date.setMinutes(0);
			start_date.setSeconds(0);
			let dt = convertDateTime(start_date);
			dateFilter["$and"].push({ 'orders.createdDate': { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			let dt = convertDateTime(end_date);
			dateFilter["$and"].push({ 'orders.createdDate': { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			dateFilter["$and"].push({ 'orders.createdDate': { $gte: dt } });
		}

		//console.log(JSON.stringify(filter));
		// Fetching sale
		const offer = await ALL_MODELS.orderItems.aggregate([
			// lookup order
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "orders",
				},
			},
			{ $unwind: "$orders" },
			//Date range filter
			{ $match: dateFilter },
			// lookup productvariants
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "pv",
				},
			},
			// lookup product
			{
				$lookup: {
					from: "products",
					localField: "pv.productId",
					foreignField: "_id",
					as: "product",
				},
			},
			{ $unwind: "$product" },
			// lookup product
			{
				$lookup: {
					from: "categories",
					localField: "product.productCategories.categoryLevel1Id",
					foreignField: "_id",
					as: "categoryLevel1",
				},
			},
			{ $unwind: "$categoryLevel1" },
			//lookup offerpricingitems
			{
				$lookup: {
					from: "offerpricingitems",
					localField: "offerPricingItemId",
					foreignField: "_id",
					as: "offerpricingitems",
				},
			},
			//lookup offerpricings
			{
				$lookup: {
					from: "offerpricings",
					localField: "offerpricingitems.offerpricingId",
					foreignField: "_id",
					as: "offerpricings",
				},
			},
			{ $unwind: "$pv" },
			{ $unwind: "$offerpricingitems" },
			{ $unwind: "$offerpricings" },
			//project
			{
				$project: {
					_id: "$offerpricingitems._id",
					offerIndexNo: "$offerpricings.indexNo",
					offerName: "$offerpricings.offerName",
					offerStatus: "$offerpricings.active",
					productVariantId: "$pv._id",
					productVariant: "$pv.productVariantDetails",
					categoryLevel1Id: "$categoryLevel1._id",
					categoryLevel1: "$categoryLevel1.categoryDetails",

					qtySold: "$quantity",
					offerDiscountAmount: { $multiply: ["$offerDiscount", "$quantity"] },
					pvNetPrice: "$retailPrice",
					couponDiscountAmount: "$couponDiscount",
					percentageOfOffer: { $round: [{ $multiply: [{ $divide: ["$offerDiscount", "$retailPrice"] }, 100] }, 2] },
					offerPrice: {
						discountType: "$offerpricingitems.discountType",
						discountValue: "$offerpricingitems.discountValue",
						offerPrice: "$offerpricingitems.offerPrice"
					}
				}
			},
			//group
			{
				$group: {
					_id: "$_id",
					offerIndexNo: { $first: "$offerIndexNo" },
					offerName: { $first: "$offerName" },
					productVariantId: { $first: "$productVariantId" },
					productVariant: { $first: "$productVariant" },
					categoryLevel1Id: { $first: "$categoryLevel1Id" },
					categoryLevel1: { $first: "$categoryLevel1" },
					offerStatus: { $first: "$offerStatus" },

					percentageOfOffer: { $first: "$percentageOfOffer" },
					quantitySold: { $sum: "$qtySold" },
					offerDiscountAmount: { $sum: "$offerDiscountAmount" },
					couponDiscountAmount: { $sum: "$couponDiscountAmount" },
					productVariantNetPrice: { $first: "$pvNetPrice" }

				}
			},
			//project
			{
				$project: {
					offerIndexNo: 1,
					offerName: 1,
					productVariantId: 1,
					productVariant: 1,
					categoryLevel1Id: 1,
					categoryLevel1: 1,
					quantitySold: 1,
					offerStatus: 1,
					offerDiscountAmount: 1,
					percentageOfOffer: 1,
					couponDiscountAmount: 1,
					productVariantNetPrice: 1,
					grossSale: { $multiply: ["$productVariantNetPrice", "$quantitySold"] },
					totalDiscountAmount: { $add: ["$offerDiscountAmount", "$couponDiscountAmount"] },
					totalAmount: { $subtract: [{ $multiply: ["$productVariantNetPrice", "$quantitySold"] }, { $add: ["$offerDiscountAmount", "$couponDiscountAmount"] }] },
					averageDiscountPercentage: { $multiply: [{ $divide: [{ $add: ["$offerDiscountAmount", "$couponDiscountAmount"] }, { $subtract: [{ $multiply: ["$productVariantNetPrice", "$quantitySold"] }, { $add: ["$offerDiscountAmount", "$couponDiscountAmount"] }] }] }, 100] }
				}
			},
			{
				$project: {
					"productVariant.productVariantDescription": 0,
					"productVariant.productSpecification": 0,
				}
			},
			// Match
			// { $match: filter },
			{ $match: Searchfilter },
			{ $match: filter },
			{ $sort: { offerIndexNo: -1 } }
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < offer.length; index++) {
			const element = offer[index];
			//console.log(element.productVariant[0].ProductVariantName)

			excelExportData.push({
				"Offer#": element.offerIndexNo,
				OfferName: element.offerName,
				ProductVariantNameEnglish: element.productVariant[0].productVariantName,
				ProductVariantNameArabic: element.productVariant[1].productVariantName,
				CategoryNameEnglish: element.categoryLevel1[0].categoryName,
				CategoryNameArabic: element.categoryLevel1[1].categoryName,
				OfferStatus: element.offerStatus,
				PercentageOfOffer: element.percentageOfOffer,
				QuantitySold: element.quantitySold,

				TotalDiscountAmount: element.totalDiscountAmount,
				TotalAmount: element.totalAmount
			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}completed_offer_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Completed Offer Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
		});

		let data = await newReport.save();

		return res.send({
			message: "offer Report has been Downloded!",
			// excelExportData:excelExportData
			d: data,
		});
	} catch (error) {
		console.log(error)
		return res.status(403).send({ message: error.message });
	}
}; // End of offer_report excel

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

const completed_offer_pv_list = async (req, res) => {

	const sellerId = ObjectId(req.userId);
	const offerPV = await ALL_MODELS.orderItems.aggregate([
		//match
		// { $match: { sellerId: sellerId } },

		// lookup productvariants
		{
			$lookup: {
				from: "productvariants",
				localField: "productVariantId",
				foreignField: "_id",
				as: "pv",
			},
		},
		//lookup offerpricingitems
		{
			$lookup: {
				from: "offerpricingitems",
				localField: "offerPricingItemId",
				foreignField: "_id",
				as: "offerpricingitems",
			},
		},

		{ $unwind: "$pv" },
		{ $unwind: "$offerpricingitems" },
		//project
		{
			$project: {
				_id: "$offerpricingitems._id",
				productVariantId: "$pv._id",
				productVariant: "$pv.productVariantDetails"
			}
		},
		//group
		{
			$group: {
				_id: "$productVariantId",
				productVariantId: { $first: "$productVariantId" },
				productVariant: { $first: "$productVariant" }
			}
		},
		//project
		{
			$project: {
				"productVariant.productVariantDescription": 0,
				"productVariant.productSpecification": 0
			}
		},
		{ $sort: { "productVariant.productVariantName": 1 } }

	]);

	const offerCategory = await ALL_MODELS.orderItems.aggregate([
		//match
		// { $match: { sellerId: sellerId } },

		// lookup productvariants
		{
			$lookup: {
				from: "productvariants",
				localField: "productVariantId",
				foreignField: "_id",
				as: "pv",
			},
		},
		// lookup product
		{
			$lookup: {
				from: "products",
				localField: "pv.productId",
				foreignField: "_id",
				as: "product",
			},
		},
		{ $unwind: "$product" },
		// lookup product
		{
			$lookup: {
				from: "categories",
				localField: "product.productCategories.categoryLevel1Id",
				foreignField: "_id",
				as: "categoryLevel1",
			},
		},
		{ $unwind: "$categoryLevel1" },
		//lookup offerpricingitems
		{
			$lookup: {
				from: "offerpricingitems",
				localField: "offerPricingItemId",
				foreignField: "_id",
				as: "offerpricingitems",
			},
		},
		{ $unwind: "$offerpricingitems" },
		//project
		{
			$project: {
				_id: "$offerpricingitems._id",
				categoryId: "$categoryLevel1._id",
				categoryLevel1: "$categoryLevel1.categoryDetails"
			}
		},
		//group
		{
			$group: {
				_id: "$_id",
				categoryId: { $first: "$categoryId" },
				categoryLevel1: { $first: "$categoryLevel1" },
			}
		},
		//group
		{
			$group: {
				_id: "$categoryId",
				categoryId: { $first: "$categoryId" },
				categoryLevel1: { $first: "$categoryLevel1" },
			}
		},
		{ $sort: { "categoryLevel1.categoryName": 1 } }
	]);

	return res.json({ productVariantList: offerPV, categoryList: offerCategory })
}

module.exports = { completed_offer_report, completed_offer_report_excel, completed_offer_pv_list };
