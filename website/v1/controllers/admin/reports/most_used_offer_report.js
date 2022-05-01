const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require('xlsx');
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

exports.most_used_offer_report = async (req, res, next) => {
	let { start_date, end_date, search, limit, page,
		quantity_start, quantity_end, total_amount_start, total_amount_end, } = req.body;

	if (!limit) { limit = 10; }
	if (!page) { page = 1; }

	let perPage = parseInt(limit);
	let pageNo = Math.max(0, parseInt(page));

	if (pageNo > 0) {
		pageNo = pageNo - 1;
	} else if (pageNo < 0) {
		pageNo = 0;
	}

	try {

		// Filter
		let filter = { $and: [] };
		let searchFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			searchFilter["$or"] = [
				{ "trendingOffer": regexp },
				{ "sellersnameOfBussinessEnglish": regexp },
			];
			if (parseFloat(search) != NaN) {
				searchFilter["$or"].push({ "totalAmount": parseFloat(search) });
				searchFilter["$or"].push({ "quantity": parseFloat(search) });
			}
		}

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 1);

		if (start_date) {
			start_date = new Date(start_date);
			start_date.setHours(23);
			start_date.setMinutes(59);
			start_date.setSeconds(59);
			start_date.setDate(start_date.getDate() - 1);
			let dt = convertDateTime(start_date);
			filter["$and"].push({ createdDate: { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(end_date);
			filter["$and"].push({ createdDate: { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			filter["$and"].push({ createdDate: { $gte: dt } });
		}

		/**
		 * Filtering
		*/
		let pricingFilters = { $and: [] };
		if (quantity_start) {
			pricingFilters["$and"].push({ quantity: { $gte: quantity_start } });
		} else {
			pricingFilters["$and"].push({ quantity: { $gte: 0 } });
		}
		if (quantity_end) {
			pricingFilters["$and"].push({ quantity: { $lte: quantity_end } });
		}
		if (total_amount_start) {
			pricingFilters["$and"].push({ totalAmount: { $gte: total_amount_start } });
		}
		if (total_amount_end) {
			pricingFilters["$and"].push({ totalAmount: { $lte: total_amount_end } });
		}

		// Fetching sale
		const total_sales_refunded = await ALL_MODELS.orderItems.aggregate([
			// Match
			{ $match: filter },
			{
				$group: {
					_id: "$offerPricingItemId",
					count: { $sum: 1 },
					quantity: {
						$sum: "$quantity",
					},
					totalAmount: {
						$sum: { $toDouble: "$grandTotal" }
					},
					offerPricingItemId: { $first: "$offerPricingItemId" },
				}
			},
			{
				$lookup: {
					from: "offerpricingitems",
					localField: "offerPricingItemId",
					foreignField: "_id",
					as: "offerpricingitem",
				},
			},
			{ $unwind: "$offerpricingitem" },
			{
				$lookup: {
					from: "offerpricings",
					localField: "offerpricingitem.offerpricingId",
					foreignField: "_id",
					as: "offerpricing",
				},
			},
			{ $unwind: "$offerpricing" },
			{
				$lookup: {
					from: "sellers",
					localField: "offerpricing.sellerId",
					foreignField: "_id",
					as: "sellers",
				},
			},
			{ $unwind: "$sellers" },
			{
				$group: {
					_id: "$offerpricingitem.offerpricingId",
					totalAmount: {
						$sum: "$totalAmount",
					},
					quantity: {
						$sum: "$quantity",
					},
					count: {
						$sum: "$count",
					},
					offerPricingItemId: { $first: "$offerPricingItemId" },
					offerpricingId: { $first: "$offerpricingitem.offerpricingId" },
					trendingOffer: { $first: "$offerpricing.offerName" },
					sellersnameOfBussinessEnglish: { $first: "$sellers.nameOfBussinessEnglish" },
					sellerDetails: { $first: "$sellers.sellerDetails" },
					sellerId: { $first: "$sellers._id" },
				}
			},
			{ $match: searchFilter },
			{ $sort: { quantity: -1 } },
			{ $match: pricingFilters },
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
			totalCount = total_sales_refunded[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: total_sales_refunded.length ? total_sales_refunded[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

exports.mostUsedOfferReportExcel = async (req, res) => {

	let { start_date, end_date, search,
		quantity_start, quantity_end, total_amount_start, total_amount_end, } = req.body;


	try {

		// Filter
		let filter = { $and: [] };
		let searchFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			searchFilter["$or"] = [
				{ "offerpricing.offerName": regexp },
			];
		}

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 1);

		if (start_date) {
			start_date = new Date(start_date);
			start_date.setHours(23);
			start_date.setMinutes(59);
			start_date.setSeconds(59);
			start_date.setDate(start_date.getDate() - 1);
			let dt = convertDateTime(start_date);
			filter["$and"].push({ createdDate: { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(end_date);
			filter["$and"].push({ createdDate: { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			filter["$and"].push({ createdDate: { $gte: dt } });
		}

		/**
		 * Filtering
		*/
		let pricingFilters = { $and: [] };
		if (quantity_start) {
			pricingFilters["$and"].push({ quantity: { $gte: quantity_start } });
		} else {
			pricingFilters["$and"].push({ quantity: { $gte: 0 } });
		}
		if (quantity_end) {
			pricingFilters["$and"].push({ quantity: { $lte: quantity_end } });
		}
		if (total_amount_start) {
			pricingFilters["$and"].push({ totalAmount: { $gte: total_amount_start } });
		}
		if (total_amount_end) {
			pricingFilters["$and"].push({ totalAmount: { $lte: total_amount_end } });
		}

		// Fetching sale
		const total_sales_refunded = await ALL_MODELS.orderItems.aggregate([
			// Match
			{ $match: filter },
			{
				$group: {
					_id: "$offerPricingItemId",
					count: { $sum: 1 },
					quantity: {
						$sum: "$quantity",
					},
					totalAmount: {
						$sum: { $toDouble: "$grandTotal" }
					},
					offerPricingItemId: { $first: "$offerPricingItemId" },
				}
			},
			{
				$lookup: {
					from: "offerpricingitems",
					localField: "offerPricingItemId",
					foreignField: "_id",
					as: "offerpricingitem",
				},
			},
			{ $unwind: "$offerpricingitem" },
			{
				$lookup: {
					from: "offerpricings",
					localField: "offerpricingitem.offerpricingId",
					foreignField: "_id",
					as: "offerpricing",
				},
			},
			{ $unwind: "$offerpricing" },
			{
				$group: {
					_id: "$offerpricingitem.offerpricingId",
					totalAmount: {
						$sum: "$totalAmount",
					},
					quantity: {
						$sum: "$quantity",
					},
					count: {
						$sum: "$count",
					},
					offerPricingItemId: { $first: "$offerPricingItemId" },
					offerpricingId: { $first: "$offerpricingitem.offerpricingId" },
					trendingOffer: { $first: "$offerpricing.offerName" },
				}
			},
			{ $match: searchFilter },
			{ $sort: { quantity: -1 } },
			{ $match: pricingFilters }
		]);
		var wb = XLSX.utils.book_new(); //new workbook
		// console.log(total_sales_refunded)
		let excelExportData = []

		for (let index = 0; index < total_sales_refunded.length; index++) {
			const element = total_sales_refunded[index];

			let a = {
				quantity: element.quantity,
				totalAmount: element.totalAmount,
				trendingOffer: element.trendingOffer,
			};
			excelExportData.push(a)
		}

		// console.log(excelExportData)

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();
		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);
		var down = `${folder}most-used-offer-report${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);
		let newReport = new ALL_MODELS.reportModel({
			adminId: req.userId,
			ReportName: "Most Used Offer Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
		})

		let data = await newReport.save()
		return res.send({ message: "Your download will begin now.", d: data })


		// return res.send({
		// 	count: total_sales_refunded.length,
		// 	data: excelExportData
		// });
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}


}


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


