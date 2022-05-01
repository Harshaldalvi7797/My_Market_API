// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('../../../middlewares/checkCreateFolder');

const delivery_charges_report = async (req, res, next) => {
	let { start_date, end_date, search, limit, page } = req.body;

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
		let filter = { $and: [] };

		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "shippingMethod": regexp },
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
			filter["$and"].push({ createdDate: { $gt: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(end_date);
			filter["$and"].push({ createdDate: { $lt: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			filter["$and"].push({ createdDate: { $gt: dt } });
		}

		/**
		 * Filtering
		 */

		// Fetching sale
		const delivery_charges = await ALL_MODELS.orderShippingNew.aggregate([

			// Match
			{ $match: filter },
			{ $match: { sellerId: sellerId } },			
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{ $unwind: { path: "$order" } },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "_id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},
			{
				$project: {
					order_no: { $concat: ["#", { $toString: "$order.indexNo" }, "_", { $toString: "$indexNo" }] },
					delivery_invoice_no: { $toString: "not added" },
					order_date: "$order.createdAt",
					delivery_charges_amount: "$shippingPrice",
					total: { $toString: { $add: ["$shippingPrice", 0] } },
					order_status: { $last: "$orderstatus.status" },
					address:"$order.customerDelhiveryDetails.shippingDetails",
					shippingMethod: 1
				}
			},
			{ $match: Searchfilter },
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
			totalCount = delivery_charges[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: delivery_charges.length ? delivery_charges[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of delivery_charges_report

const delivery_charges_report_excel = async (req, res, next) => {
	let { start_date, end_date, search, limit, page } = req.body;

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
		let filter = { $and: [] };

		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			Searchfilter["$or"] = [
				{ "shippingMethod": regexp },

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
			filter["$and"].push({ createdDate: { $gt: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(end_date);
			filter["$and"].push({ createdDate: { $lt: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			filter["$and"].push({ createdDate: { $gt: dt } });
		}

		/**
		 * Filtering
		 */

		// Fetching sale
		const delivery_charges = await ALL_MODELS.orderShippingNew.aggregate([

			{ $match: filter },
			{ $match: { sellerId: sellerId } },			
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{ $unwind: { path: "$order" } },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "_id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},
			{
				$project: {
					order_no: { $concat: ["#", { $toString: "$order.indexNo" }, "_", { $toString: "$indexNo" }] },
					delivery_invoice_no: { $toString: "not added" },
					order_date: "$order.createdAt",
					delivery_charges_amount: "$shippingPrice",
					total: { $toString: { $add: ["$shippingPrice", 0] } },
					order_status: { $last: "$orderstatus.status" },
					address:"$order.customerDelhiveryDetails.shippingDetails",
					shippingMethod: 1
				}
			},
			{ $match: Searchfilter },
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

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < delivery_charges[0].paginatedResults.length; index++) {
			const element = delivery_charges[0].paginatedResults[index];
			console.log(element);

			excelExportData.push({
				"OrderNo": element.order_no,
				OrderDate: element.order_date,
				Customer: element.address.customerName,
				DeliveryChargesAmount: element.delivery_charges_amount,
				Total: element.total,
				DeliveryStatus: element.order_status,
				Address:`${element.address.addressLine1}, ${element.address.addressLine2}`,
				Country:element.address.country
			});
		}
		// excelExportData.push(delivery_charges)

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}delivery_charges_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "delivery_charges Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
		});

		let data = await newReport.save();

		return res.send({
			message: "delivery_charges Report has been Downloded!",
			d: data,
		});
	} catch (error) {
		console.log(error)
		return res.status(403).send({ message: error.message });
	}
}; // End of delivery_charges_report excel

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

module.exports = { delivery_charges_report, delivery_charges_report_excel };
