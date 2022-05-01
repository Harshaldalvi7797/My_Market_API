// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");

var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const delivery_report = async (req, res) => {
	let { start_date, end_date, search, limit, page, selectCountries, seller_name, delivered_by } = req.body;
	if (!selectCountries || selectCountries.length === 0) {
		selectCountries = [
			"Bahrain",
			"Kuwait",
			"Oman",
			"Qatar",
			"Saudi_Arabia",
			"United_Arab_Emirates",
		];
	}

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
		let filter = { $and: [] };
		let secondFilter = {};

		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			Searchfilter["$or"] = [
				// { "productVariantDetails.productVariantName": regexp },
				{ "seller.nameOfBussinessEnglish": regexp },
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
			start_date.setHours(0);
			start_date.setMinutes(0);
			start_date.setSeconds(0);
			let dt = convertDateTime(start_date);
			filter["$and"].push({ "order.createdDate": { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			let dt = convertDateTime(end_date);
			filter["$and"].push({ "order.createdDate": { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			filter["$and"].push({ "order.createdDate": { $gt: dt } });
		}

		/**
		 * Filtering
		 */
		if (seller_name) {
			// const regexp = new RegExp(seller_name, "i");
			if (!secondFilter["$and"]) { secondFilter["$and"] = [] }
			secondFilter["$and"].push({ "seller.nameOfBussinessEnglish": { $in: seller_name } });
		}

		if (delivered_by) {
			if (!secondFilter["$and"]) { secondFilter["$and"] = [] }
			// secondFilter["$and"].push({ "orderstatus.status": "Delivered" });
			secondFilter["$and"].push({ "ordershipping.shippingMethod": { $in: delivered_by } });

		}


		// Fetching sale
		const delivery = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{ $unwind: "$order" },
			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershipping",
				},
			},
			{ $unwind: "$ordershipping" },
			// Match
			{ $match: filter },
			{
				$match: {
					"order.customerDelhiveryDetails.shippingDetails.country": {
						$in: selectCountries,
					},
				},
			},
			{
				$project: {
					ordershipping: 1,
					orderId: "$order._id",
					orderIndexNo: "$order.indexNo",
					createdDate: "$order.createdDate",
					createdAt: "$order.createdAt",
					productVariant: "$productVariantDetails.productVariantName",
					totalQuantityOrdered: "$quantity",
					totalAmount: "$grandTotal",
					address: "$order.customerDelhiveryDetails.shippingDetails",
					sellerId: "$ordershipping.sellerId",
				},
			},
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{ $unwind: "$seller" },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershipping._id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},
			// { $unwind: "$orderstatus" },
			{ $addFields: { orderstatus: { $last: "$orderstatus" } } },
			{ $match: Searchfilter },
			{ $match: secondFilter },
			{ $sort: { orderIndexNo: -1 } },
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

		//Fetching seller list for filter
		const sellerList = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{ $unwind: "$order" },
			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershipping",
				},
			},
			{ $unwind: "$ordershipping" },
			{
				$project: {
					ordershipping: 1,
					orderId: "$order._id",
					orderIndexNo: "$order.indexNo",
					createdDate: "$order.createdDate",
					productVariant: "$productVariantDetails.productVariantName",
					totalQuantityOrdered: 1,
					totalAmount: 1,
					address: "$order.customerDelhiveryDetails.shippingDetails",
					sellerId: "$ordershipping.sellerId",
				},
			},
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{ $unwind: "$seller" },

			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershipping._id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},
			{
				$project: {
					"seller.nameOfBussinessEnglish": 1,
					"seller.nameOfBussinessArabic": 1,
				}
			},
			{
				$group: {
					_id: "",
					nameOfBussinessEnglish: { $addToSet: "$seller.nameOfBussinessEnglish" },
					nameOfBussinessArabic: { $addToSet: "$seller.nameOfBussinessArabic" }

				}
			},
			{ $project: { _id: 0 } }
		]);

		let sellerCount = sellerList[0].nameOfBussinessEnglish.sort((a, b) => {
			if (a < b) { return -1; }
			if (a > b) { return 1; }
			return 0;
		});

		let totalCount = 0;
		try {
			totalCount = delivery[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: delivery.length ? delivery[0].paginatedResults : [],
			sellerList: sellerCount,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

const delivery_report_excel = async (req, res) => {
	let { start_date, end_date, search, selectCountries, seller_name, delivered_by } = req.body;
	if (!selectCountries || selectCountries.length === 0) {
		selectCountries = [
			"Bahrain",
			"Kuwait",
			"Oman",
			"Qatar",
			"Saudi Arabia",
			"United Arab Emirates",
		];
	}


	try {
		// Filter
		let filter = { $and: [] };
		let secondFilter = {};

		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			Searchfilter["$or"] = [
				// { "productVariantDetails.productVariantName": regexp },
				{ "seller.nameOfBussinessEnglish": regexp },
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
			start_date.setHours(0);
			start_date.setMinutes(0);
			start_date.setSeconds(0);
			let dt = convertDateTime(start_date);
			filter["$and"].push({ "order.createdDate": { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			let dt = convertDateTime(end_date);
			filter["$and"].push({ "order.createdDate": { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			filter["$and"].push({ "order.createdDate": { $gt: dt } });
		}

		/**
		 * Filtering
		 */
		if (seller_name) {
			// const regexp = new RegExp(seller_name, "i");
			if (!secondFilter["$and"]) { secondFilter["$and"] = [] }
			secondFilter["$and"].push({ "seller.nameOfBussinessEnglish": { $in: seller_name } });
		}

		if (delivered_by) {
			if (!secondFilter["$and"]) { secondFilter["$and"] = [] }
			// secondFilter["$and"].push({ "orderstatus.status": "Delivered" });
			secondFilter["$and"].push({ "ordershipping.shippingMethod": { $in: delivered_by } });

		}

		// Fetching sale
		const delivery = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{ $unwind: "$order" },
			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershipping",
				},
			},
			{ $unwind: "$ordershipping" },
			// Match
			{ $match: filter },
			{
				$match: {
					"order.customerDelhiveryDetails.shippingDetails.country": {
						$in: selectCountries,
					},
				},
			},
			{
				$project: {
					ordershipping: 1,
					orderId: "$order._id",
					orderIndexNo: "$order.indexNo",
					createdDate: "$order.createdDate",
					createdAt: "$order.createdAt",
					productVariant: "$productVariantDetails.productVariantName",
					totalQuantityOrdered: "$quantity",
					totalAmount: "$grandTotal",
					address: "$order.customerDelhiveryDetails.shippingDetails",
					sellerId: "$ordershipping.sellerId",
				},
			},
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{ $unwind: "$seller" },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershipping._id",
					foreignField: "orderShippingId",
					as: "orderstatus",
				},
			},
			// { $unwind: "$orderstatus" },
			{ $addFields: { orderstatus: { $last: "$orderstatus" } } },
			{ $match: Searchfilter },
			{ $match: secondFilter },
			{ $sort: { orderIndexNo: -1 } },
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		console.log(delivery.length);
		for (let index = 0; index < delivery.length; index++) {
			const element = delivery[index];

			let orderDate = new Date(element.createdAt);
			excelExportData.push({
				"Order#": element.orderIndexNo,
				OrderDate: `${orderDate.toUTCString().toString().slice(0, 16)} ${orderDate.toLocaleString().toString().slice(10)}`,
				Seller: element.seller.nameOfBussinessEnglish,
				ProductVariant: element.productVariant[0],
				TotalQuantityOrdered: element.totalQuantityOrdered,
				TotalAmount: element.totalAmount,
				Address: element.address.addressLine1 + element.address.addressLine2
			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}delivery_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Delivery Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
		});

		let data = await newReport.save();

		return res.send({
			message: "Your XL will start downloading now.",
			d: data,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

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

module.exports = { delivery_report, delivery_report_excel };
