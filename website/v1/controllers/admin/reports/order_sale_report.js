const path = require("path");

// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

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

const order_sale_report = async (req, res, next) => {
	let { orderIndexNo, start_date, end_date, discount_start, discount_end, item_quantity_start,
		item_quantity_end, gross_sale_start, gross_sale_end, net_sale_start, net_sale_end, refunded_amount_start,
		refunded_amount_end, refunded_tax_amount_start, refunded_tax_amount_end, vat_amount_start, vat_amount_end,
		total_amount_start, total_amount_end, search } = req.body;

	let { limit, page } = req.body;

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
		let filter = {};
		let dateFilter = { $and: [] };
		/**
		 * Filtering according to date
		 */

		if (start_date) {
			dateFilter['$and'].push({ "order.createdDate": { $gte: convertDateTime(new Date(start_date)) } });
		}
		if (end_date) {
			dateFilter['$and'].push({ "order.createdDate": { $lte: convertDateTime(new Date(end_date)) } });
		}

		// Going to apply defalult 7 date filter
		const defaultDate = new Date();
		defaultDate.setDate(defaultDate.getDate() - 7);
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		if (!start_date) {
			dateFilter['$and'].push({
				"order.createdDate": { $gte: convertDateTime(new Date(defaultDate)) }
			})
		}

		if (orderIndexNo) {
			filter.orderIndexNo = orderIndexNo;
		}

		/** * Search */
		if (search) {
			let regexSearch = new RegExp(search, "i");
			filter["$or"] = [];
			filter["$or"].push({ seller: regexSearch });

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				filter["$or"].push({ quantity: parseInt(search) });
				filter["$or"].push({ totalDiscount: parseFloat(search) });
				filter["$or"].push({ RefundedAmount: parseFloat(search) });
				filter["$or"].push({ RefundedTaxAmount: parseFloat(search) });
				filter["$or"].push({ NetSales: parseFloat(search) });
				filter["$or"].push({ VatAmount: parseFloat(search) });
				filter["$or"].push({ GrossSale: parseFloat(search) });
				filter["$or"].push({ totalAmount: parseFloat(search) });
				filter["$or"].push({ orderIndexNo: parseInt(search) });
			}
		}

		/** * Filtering */

		// item quantity
		if (item_quantity_start) { filter.totalQuantity = { $gte: item_quantity_start }; }
		if (item_quantity_end) { filter.totalQuantity = { $lte: item_quantity_end }; }
		if (item_quantity_start && item_quantity_end) { filter.totalQuantity = { $gte: parseInt(item_quantity_start), $lte: parseInt(item_quantity_end) }; }
		// End of item quantity

		// gross_sale
		if (gross_sale_start) { filter.GrossSale = { $gte: gross_sale_start }; }
		if (gross_sale_end) { filter.GrossSale = { $lte: gross_sale_end }; }
		if (gross_sale_start && gross_sale_end) { filter.GrossSale = { $gte: gross_sale_start, $lte: gross_sale_end, }; }
		// End of net_sale

		// net_sale
		if (net_sale_start) { filter.NetSales = { $gte: net_sale_start }; }
		if (net_sale_end) { filter.NetSales = { $lte: net_sale_end }; }
		if (net_sale_start && net_sale_end) { filter.NetSales = { $gte: net_sale_start, $lte: net_sale_end, }; }
		// End of net_sale

		// refunded
		if (refunded_amount_start) { filter.RefundedAmount = { $gte: refunded_amount_start }; }
		if (refunded_amount_end) { filter.RefundedAmount = { $lte: refunded_amount_end }; }
		if (refunded_amount_start && refunded_amount_end) { filter.RefundedAmount = { $gte: refunded_amount_start, $lte: refunded_amount_end, }; }
		// End of refunded

		// refundedTax
		if (refunded_tax_amount_start) { filter.RefundedTaxAmount = { $gte: refunded_tax_amount_start }; }
		if (refunded_tax_amount_end) { filter.RefundedTaxAmount = { $lte: refunded_tax_amount_end }; }
		if (refunded_tax_amount_start && refunded_tax_amount_end) { filter.RefundedTaxAmount = { $gte: refunded_tax_amount_start, $lte: refunded_tax_amount_end, }; }
		// End of refundedTax

		// discount
		if (discount_start) { filter.totalDiscount = { $gte: discount_start }; }
		if (discount_end) { filter.totalDiscount = { $lte: discount_end }; }
		if (discount_start && discount_end) { filter.totalDiscount = { $gte: discount_start, $lte: discount_end, }; }
		// End of discount

		// vat_amount
		if (vat_amount_start) { filter.VatAmount = { $gte: vat_amount_start }; }
		if (vat_amount_end) { filter.VatAmount = { $lte: vat_amount_end }; }
		if (vat_amount_start && vat_amount_end) { filter.VatAmount = { $gte: vat_amount_start, $lte: vat_amount_end, }; }
		// End of vat_amount

		// total_amount
		if (total_amount_start) { filter.totalAmount = { $gte: total_amount_start }; }
		if (total_amount_end) { filter.totalAmount = { $lte: total_amount_end }; }
		if (total_amount_start && total_amount_end) { filter.totalAmount = { $gte: total_amount_start, $lte: total_amount_end, }; }
		// End of total_amount

		// console.log(JSON.stringify(filter))

		// Fetching order sale
		const order_sale = await ALL_MODELS.orderItems.aggregate([
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller"
				}
			},
			{ $unwind: "$seller" },
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
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
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
				$addFields: {
					RefundedAmount: { $cond: { if: { $eq: ["$RefundedAmount", ""] }, then: 0, else: { $toDouble: "$RefundedAmount" } } }
				}
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
					orderId: "$order._id",
					orderIndexNo: "$order.indexNo",
					seller: "$seller.nameOfBussinessEnglish",
					sellerIndexNo: "$seller.indexNo",

					quantity: 1,
					discounts: {
						offerPrice: "$offerPrice",
						offerDiscount: "$offerDiscount",
						couponCode: "$couponCode",
						couponDiscount: "$couponDiscount",
						totalDiscount: "$totalDiscount",
					},
					RefundedAmount: 1,
					RefundedTaxAmount: 1,

					productNetPrice: { $toDouble: "$retailPrice" },
					total: { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] },
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
				$group: {
					_id: { $concat: [{ $toString: "$sellerIndexNo" }, "_", { $toString: "$orderIndexNo" }] },
					orderIndexNo: { $first: "$orderIndexNo" },
					seller: { $first: "$seller" },
					quantity: { $sum: "$quantity" },
					totalDiscount: { $sum: "$discounts.totalDiscount" },
					RefundedAmount: { $sum: { $toDouble: "$RefundedAmount" } },
					RefundedTaxAmount: { $sum: { $toDouble: "$RefundedTaxAmount" } },
					// NetList: { $push: "$NateSales" },
					NetSales: { $sum: "$NateSales" },
					VatAmount: { $sum: "$VatAmount" },
					GrossSale: { $sum: "$GrossSale" },
					totalAmount: { $sum: "$totalAmount" }
				}
			},
			{
				$project: {
					_id: 1,
					orderIndexNo: 1,
					seller: 1,
					quantity: 1,
					// NetList:1,
					totalDiscount: { $round: ["$totalDiscount", 3] },
					RefundedAmount: { $round: ["$RefundedAmount", 3] },
					RefundedTaxAmount: { $round: ["$RefundedTaxAmount", 3] },
					NetSales: { $round: ["$NetSales", 3] },
					VatAmount: { $round: ["$VatAmount", 3] },
					GrossSale: { $round: ["$GrossSale", 3] },
					totalAmount: { $round: ["$totalAmount", 3] }
				}
			},
			{ $sort: { orderIndexNo: -1 } },
			{ $match: filter },
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

		const orderSalesList = order_sale.length ? order_sale[0].paginatedResults : [];
		let totalCount = 0;
		try {
			totalCount = order_sale[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: orderSalesList,
			count: orderSalesList.length,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

const order_sale_report_excel = async (req, res, next) => {
	let { orderIndexNo, start_date, end_date, discount_start, discount_end, item_quantity_start,
		item_quantity_end, gross_sale_start, gross_sale_end, net_sale_start, net_sale_end, refunded_amount_start,
		refunded_amount_end, refunded_tax_amount_start, refunded_tax_amount_end,
		vat_amount_start, vat_amount_end, total_amount_start, total_amount_end, search } = req.body;

	try {
		// Filter
		let filter = {};
		let dateFilter = { $and: [] };
		/**
		 * Filtering according to date
		 */

		if (start_date) {
			dateFilter['$and'].push({ "order.createdDate": { $gte: convertDateTime(new Date(start_date)) } });
		}
		if (end_date) {
			dateFilter['$and'].push({ "order.createdDate": { $lte: convertDateTime(new Date(end_date)) } });
		}

		// Going to apply defalult 7 date filter
		const defaultDate = new Date();
		defaultDate.setDate(defaultDate.getDate() - 7);
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		if (!start_date) {
			dateFilter['$and'].push({
				"order.createdDate": { $gte: convertDateTime(new Date(defaultDate)) }
			})
		}

		if (orderIndexNo) {
			filter.orderIndexNo = orderIndexNo;
		}

		/** * Search */
		if (search) {
			let regexSearch = new RegExp(search, "i");
			filter["$or"] = [];
			filter["$or"].push({ seller: regexSearch });

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				filter["$or"].push({ quantity: parseInt(search) });
				filter["$or"].push({ totalDiscount: parseFloat(search) });
				filter["$or"].push({ RefundedAmount: parseFloat(search) });
				filter["$or"].push({ RefundedTaxAmount: parseFloat(search) });
				filter["$or"].push({ NetSales: parseFloat(search) });
				filter["$or"].push({ VatAmount: parseFloat(search) });
				filter["$or"].push({ GrossSale: parseFloat(search) });
				filter["$or"].push({ totalAmount: parseFloat(search) });
				filter["$or"].push({ orderIndexNo: parseInt(search) });
			}
		}

		
		/** * Filtering */

		// item quantity
		if (item_quantity_start) { filter.totalQuantity = { $gte: item_quantity_start }; }
		if (item_quantity_end) { filter.totalQuantity = { $lte: item_quantity_end }; }
		if (item_quantity_start && item_quantity_end) { filter.totalQuantity = { $gte: parseInt(item_quantity_start), $lte: parseInt(item_quantity_end) }; }
		// End of item quantity

		// gross_sale
		if (gross_sale_start) { filter.GrossSale = { $gte: gross_sale_start }; }
		if (gross_sale_end) { filter.GrossSale = { $lte: gross_sale_end }; }
		if (gross_sale_start && gross_sale_end) { filter.GrossSale = { $gte: gross_sale_start, $lte: gross_sale_end, }; }
		// End of net_sale

		// net_sale
		if (net_sale_start) { filter.NetSales = { $gte: net_sale_start }; }
		if (net_sale_end) { filter.NetSales = { $lte: net_sale_end }; }
		if (net_sale_start && net_sale_end) { filter.NetSales = { $gte: net_sale_start, $lte: net_sale_end, }; }
		// End of net_sale

		// refunded
		if (refunded_amount_start) { filter.RefundedAmount = { $gte: refunded_amount_start }; }
		if (refunded_amount_end) { filter.RefundedAmount = { $lte: refunded_amount_end }; }
		if (refunded_amount_start && refunded_amount_end) { filter.RefundedAmount = { $gte: refunded_amount_start, $lte: refunded_amount_end, }; }
		// End of refunded

		// refundedTax
		if (refunded_tax_amount_start) { filter.RefundedTaxAmount = { $gte: refunded_tax_amount_start }; }
		if (refunded_tax_amount_end) { filter.RefundedTaxAmount = { $lte: refunded_tax_amount_end }; }
		if (refunded_tax_amount_start && refunded_tax_amount_end) { filter.RefundedTaxAmount = { $gte: refunded_tax_amount_start, $lte: refunded_tax_amount_end, }; }
		// End of refundedTax

		// discount
		if (discount_start) { filter.totalDiscount = { $gte: discount_start }; }
		if (discount_end) { filter.totalDiscount = { $lte: discount_end }; }
		if (discount_start && discount_end) { filter.totalDiscount = { $gte: discount_start, $lte: discount_end, }; }
		// End of discount

		// vat_amount
		if (vat_amount_start) { filter.VatAmount = { $gte: vat_amount_start }; }
		if (vat_amount_end) { filter.VatAmount = { $lte: vat_amount_end }; }
		if (vat_amount_start && vat_amount_end) { filter.VatAmount = { $gte: vat_amount_start, $lte: vat_amount_end, }; }
		// End of vat_amount

		// total_amount
		if (total_amount_start) { filter.totalAmount = { $gte: total_amount_start }; }
		if (total_amount_end) { filter.totalAmount = { $lte: total_amount_end }; }
		if (total_amount_start && total_amount_end) { filter.totalAmount = { $gte: total_amount_start, $lte: total_amount_end, }; }
		// End of total_amount


		// Fetching order sale
		const order_sale = await ALL_MODELS.orderItems.aggregate([
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller"
				}
			},
			{ $unwind: "$seller" },
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
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
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
				$addFields: {
					RefundedAmount: { $cond: { if: { $eq: ["$RefundedAmount", ""] }, then: 0, else: { $toDouble: "$RefundedAmount" } } }
				}
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
					orderId: "$order._id",
					orderIndexNo: "$order.indexNo",
					seller: "$seller.nameOfBussinessEnglish",
					sellerIndexNo: "$seller.indexNo",

					quantity: 1,
					discounts: {
						offerPrice: "$offerPrice",
						offerDiscount: "$offerDiscount",
						couponCode: "$couponCode",
						couponDiscount: "$couponDiscount",
						totalDiscount: "$totalDiscount",
					},
					RefundedAmount: 1,
					RefundedTaxAmount: 1,

					productNetPrice: { $toDouble: "$retailPrice" },
					total: { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] },
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
				$group: {
					_id: { $concat: [{ $toString: "$sellerIndexNo" }, "_", { $toString: "$orderIndexNo" }] },
					orderIndexNo: { $first: "$orderIndexNo" },
					seller: { $first: "$seller" },
					quantity: { $sum: "$quantity" },
					totalDiscount: { $sum: "$discounts.totalDiscount" },
					RefundedAmount: { $sum: { $toDouble: "$RefundedAmount" } },
					RefundedTaxAmount: { $sum: { $toDouble: "$RefundedTaxAmount" } },
					NetSales: { $sum: "$NateSales" },
					VatAmount: { $sum: "$VatAmount" },
					GrossSale: { $sum: "$GrossSale" },
					totalAmount: { $sum: "$totalAmount" }
				}
			},
			{
				$project: {
					_id: 1,
					orderIndexNo: 1,
					seller: 1,
					quantity: 1,
					// NetList:1,
					totalDiscount: { $round: ["$totalDiscount", 3] },
					RefundedAmount: { $round: ["$RefundedAmount", 3] },
					RefundedTaxAmount: { $round: ["$RefundedTaxAmount", 3] },
					NetSales: { $round: ["$NetSales", 3] },
					VatAmount: { $round: ["$VatAmount", 3] },
					GrossSale: { $round: ["$GrossSale", 3] },
					totalAmount: { $round: ["$totalAmount", 3] }
				}
			},
			{ $sort: { orderIndexNo: -1 } },
			{ $match: filter }
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < order_sale.length; index++) {
			const element = order_sale[index];

			excelExportData.push({
				"OrderIndexNo": element.orderIndexNo,
				"Seller": element.seller,
				"Quantity": element.quantity,
				"TotalDiscount": element.totalDiscount,
				"RefundedAmount": element.RefundedAmount,
				"RefundedTaxAmount": element.RefundedTaxAmount,
				"NetSales": element.NetSales,
				"VatAmount": element.VatAmount,
				"GrossSale": element.GrossSale,
				"TotalAmount": element.totalAmount,
			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}order_sale_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Order Sale Report",
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

module.exports = { order_sale_report, order_sale_report_excel };
