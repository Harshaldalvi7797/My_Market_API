// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('../../../middlewares/checkCreateFolder');

const shipping_update_report = async (req, res, next) => {
	let { search, limit, page } = req.body;

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
		const sellerId = ObjectId(req.userId);

		// Filter
		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
				{ "seller.sellerDetails.sellerfName": regexp },
				{ "seller.sellerDetails.sellerlName": regexp },
				{ "orderstatus.status": regexp },
			];
		}

		/**
		 * Filtering
		 */




		// Fetching sale
		const shipping_update = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershipping",
				},
			},
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershipping._id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},

			// Match
			{ $match: { sellerId: sellerId } },

			// Search
			{ $match: Searchfilter },


			{ $unwind: "$seller" },
			{ $unwind: "$ordershipping" },
			{ $unwind: "$orderstatus" },

			{
				$project: {
					orderId: 1,
					productVariantDetails: 1,
					seller: "$seller.sellerDetails",
					status: "$orderstatus.status",
					lastUpdatedTimestamp: "$orderstatus.statusUpdatedate",
					// ordershipping: 1,
					orderstatus: 1,
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
		let totalCount = 0;
		try {
			totalCount = shipping_update[0].totalCount[0].count;
		} catch (err) { }

		return res.send({
			totalCount: totalCount,
			data: shipping_update.length ? shipping_update[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of shipping_update_report

const shipping_update_report_excel = async (req, res, next) => {
	let { search, limit, page } = req.body;

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
		const sellerId = ObjectId(req.userId);

		// Filter
		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
				{ "seller.sellerDetails.sellerfName": regexp },
				{ "seller.sellerDetails.sellerlName": regexp },
				{ "orderstatus.status": regexp },
			];
		}

		/**
		 * Filtering
		 */

		// Fetching sale
		const shipping_update = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershipping",
				},
			},
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershipping._id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},

			// Match
			{ $match: { sellerId: sellerId } },

			// Search
			{ $match: Searchfilter },


			{ $unwind: "$seller" },
			{ $unwind: "$ordershipping" },
			{ $unwind: "$orderstatus" },

			{
				$project: {
					orderId: 1,
					productVariantDetails: 1,
					seller: "$seller.sellerDetails",
					status: "$orderstatus.status",
					lastUpdatedTimestamp: "$orderstatus.statusUpdatedate",
					// ordershipping: 1,
					orderstatus: 1,
				},
			}
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < shipping_update.length; index++) {
			const element = shipping_update[index];

			excelExportData.push({
				orderId: 1,
				productVariantDetails: 1,
				seller: `${element.seller.sellerfName} ${element.seller.sellerlName}`,
				status: element.orderstatus.status,
				lastUpdatedTimestamp: element.orderstatus.statusUpdatedate,
			});
		}
		// excelExportData.push(shipping_update)

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}shipping_update_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Shipping Update Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
		});

		let data = await newReport.save();

		return res.send({
			message: "Your XL will start downloading now.",
			d: data,
		});
	} catch (error) {
		console.log(error)
		return res.status(403).send({ message: error.message });
	}
}; // End of shipping_update_report excel

module.exports = { shipping_update_report, shipping_update_report_excel };
