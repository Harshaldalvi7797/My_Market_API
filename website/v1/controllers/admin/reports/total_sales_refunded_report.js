const { ObjectId } = require("mongoose").Types;
const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require("xlsx");

const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const total_sales_refunded_report = async (req, res) => {
	let { start_date, end_date, search, limit, page, netStart, netEnd,
		totalAmountStart, totalAmountEnd, discountStart, discountEnd,
		quantityStart, quantityEnd, grossStart, grossEnd,
		vatStart, vatEnd } = req.body;

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
		let dateFilter = { $and: [] };
		let Searchfilter = {};
		if (search) {
			Searchfilter["$or"] = [];
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"].push({ sellerEnglish: regexp });

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				Searchfilter["$or"].push({ quantity: parseInt(search) });
				Searchfilter["$or"].push({ netSale: parseFloat(search) });
				Searchfilter["$or"].push({ totalDiscount: parseFloat(search) });
				Searchfilter["$or"].push({ offerDiscount: parseFloat(search) });
				Searchfilter["$or"].push({ refundedAmount: parseFloat(search) });
				Searchfilter["$or"].push({ totalAmount: parseFloat(search) });
				Searchfilter["$or"].push({ vatAmount: parseFloat(search) });
				Searchfilter["$or"].push({ grossSale: parseFloat(search) });
			}
		}

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 4);

		if (start_date) {
			start_date = new Date(start_date);
			start_date.setHours(23);
			start_date.setMinutes(59);
			start_date.setSeconds(59);
			start_date.setDate(start_date.getDate() - 1);
			let dt = convertDateTime(start_date);
			dateFilter["$and"].push({ "orders.createdDate": { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(end_date);
			dateFilter["$and"].push({ "orders.createdDate": { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			dateFilter["$and"].push({ "orders.createdDate": { $gte: dt } });
		}


		/**
		 * Filtering
		*/
		let pricingFilters = {};

		if (quantityStart || quantityEnd || discountStart || discountEnd || grossStart || grossEnd || netStart || netEnd || vatStart || vatEnd || totalAmountStart || totalAmountEnd) {
			pricingFilters['$and'] = [];
		}

		//quantity filter
		if (quantityStart) {
			pricingFilters["$and"].push({ quantity: { $gte: quantityStart } });
		}
		if (quantityEnd) {
			pricingFilters["$and"].push({ quantity: { $lte: quantityEnd } });
		}

		//discount filter
		if (discountStart) {
			pricingFilters["$and"].push({ totalDiscount: { $gte: discountStart } });
		}
		if (discountEnd) {
			pricingFilters["$and"].push({ totalDiscount: { $lte: discountEnd } });
		}

		//gross sale filter
		if (grossStart) {
			pricingFilters["$and"].push({ grossSale: { $gte: grossStart } });
		}
		if (grossEnd) {
			pricingFilters["$and"].push({ grossSale: { $lte: grossEnd } });
		}

		//net price filter
		if (netStart) {
			pricingFilters["$and"].push({ netSale: { $gte: netStart } });
		} /* else {
			pricingFilters["$and"].push({ netSale: { $gt: 0 } });
		} */
		if (netEnd) {
			pricingFilters["$and"].push({ netSale: { $lte: netEnd } });
		}

		//vat amount filter
		if (vatStart) {
			pricingFilters["$and"].push({ vatAmount: { $gte: vatStart } });
		}
		if (vatEnd) {
			pricingFilters["$and"].push({ vatAmount: { $lte: vatEnd } });
		}

		//total amount filter
		if (totalAmountStart) {
			pricingFilters["$and"].push({ totalAmount: { $gte: totalAmountStart } });
		}
		if (totalAmountEnd) {
			pricingFilters["$and"].push({ totalAmount: { $lte: totalAmountEnd } });
		}

		// Fetching sale
		const total_sales_refunded = await ALL_MODELS.orderItems.aggregate([
			// Match
			{ $match: { Refunded: true } },
			// lookup seller
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{ $unwind: "$seller" },
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
			{ $unwind: "$pv" },
			{
				$addFields: {
					refundedAmount: { $cond: { if: { $ne: ["$RefundedAmount", ""] }, then: { $toDouble: { $toString: "$RefundedAmount" } }, else: 0 } }
				}
			},
			{
				$addFields: {
					totalAmount: {
						$subtract: [
							{ $toDouble: { $toString: "$retailPrice" } },
							{ $add: ["$totalDiscount", "$refundedAmount"] }
						]
					},
				}
			},
			{
				$project: {
					sellerEnglish: "$seller.nameOfBussinessEnglish",
					sellerArabic: "$seller.nameOfBussinessEnglish",
					sellerIndexNo: "$seller.indexNo",
					createdDate: "$orders.createdAt",
					quantity: 1,
					totalAmount: 1,
					refundedReason: "$RefundedComment",
					refundedChargesPaidBy: "$RefundChargesPaidBy",
					refundedTo: "$RefundedTo",

					netPrice: "$retailPrice",
					totalDiscount: "$totalDiscount",
					offerDiscount: "$offerDiscount",
					refundedAmount: 1,

					vatAmount: { $multiply: [{ $subtract: [{ $toDouble: { $toString: "$retailPrice" } }, { $add: ["$totalDiscount", "$refundedAmount"] }] }, { $divide: [{ $toDouble: { $toString: "$pv.productTaxPercentage" } }, 100] }] },

					grossSale: { $subtract: ["$totalAmount", { $multiply: [{ $subtract: [{ $toDouble: { $toString: "$retailPrice" } }, { $add: ["$totalDiscount", "$refundedAmount"] }] }, { $divide: [{ $toDouble: { $toString: "$pv.productTaxPercentage" } }, 100] }] }] },
					//grossSale: { $multiply: [{ $toDouble: { $toString: "$retailPrice" } }, "$quantity"] },
					// netSale: { $subtract: [{ $multiply: [{ $toDouble: { $toString: "$retailPrice" } }, "$quantity"] }, "$totalDiscount"] }
					netSale: {
						$subtract: [
							"$grandTotal",
							{
								$add: ["$totalDiscount", "$refundedAmount"]
							}
						]
					}
				},
			},
			{
				$group: {
					_id: "$sellerIndexNo",
					sellerEnglish: { $first: "$sellerEnglish" },
					sellerArabic: { $first: "$sellerArabic" },
					quantity: { $sum: "$quantity" },
					totalAmount: { $sum: "$totalAmount" },
					netPrice: { $sum: "$netPrice" },
					totalDiscount: { $sum: "$totalDiscount" },
					offerDiscount: { $sum: "$offerDiscount" },
					refundedAmount: { $sum: "$refundedAmount" },
					vatAmount: { $sum: "$vatAmount" },
					grossSale: { $sum: "$grossSale" },
					netSale: { $sum: "$netSale" },
				}
			},
			{ $match: pricingFilters },
			{ $match: Searchfilter },
			{ $sort: { _id: -1 } },
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
			data: total_sales_refunded.length
				? total_sales_refunded[0].paginatedResults
				: [],
			count: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of total_sales_refunded_report


const total_sales_refunded_report_excel = async (req, res) => {
	let { start_date, end_date, search, limit, page, netStart, netEnd,
		totalAmountStart, totalAmountEnd, discountStart, discountEnd,
		quantityStart, quantityEnd, grossStart, grossEnd,
		vatStart, vatEnd } = req.body;

	try {
		// Filter
		let dateFilter = { $and: [] };
		let Searchfilter = {};
		if (search) {
			Searchfilter["$or"] = [];
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"].push({ sellerEnglish: regexp });

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				Searchfilter["$or"].push({ quantity: parseInt(search) });
				Searchfilter["$or"].push({ netSale: parseFloat(search) });
				Searchfilter["$or"].push({ totalDiscount: parseFloat(search) });
				Searchfilter["$or"].push({ offerDiscount: parseFloat(search) });
				Searchfilter["$or"].push({ refundedAmount: parseFloat(search) });
				Searchfilter["$or"].push({ totalAmount: parseFloat(search) });
				Searchfilter["$or"].push({ vatAmount: parseFloat(search) });
				Searchfilter["$or"].push({ grossSale: parseFloat(search) });
			}
		}

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 4);

		if (start_date) {
			start_date = new Date(start_date);
			start_date.setHours(23);
			start_date.setMinutes(59);
			start_date.setSeconds(59);
			start_date.setDate(start_date.getDate() - 1);
			let dt = convertDateTime(start_date);
			dateFilter["$and"].push({ "orders.createdDate": { $gte: dt } });
		}
		if (end_date) {
			end_date = new Date(end_date);
			end_date.setHours(23);
			end_date.setMinutes(59);
			end_date.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(end_date);
			dateFilter["$and"].push({ "orders.createdDate": { $lte: dt } });
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			dateFilter["$and"].push({ "orders.createdDate": { $gte: dt } });
		}


		/**
		 * Filtering
		*/
		let pricingFilters = {};

		if (quantityStart || quantityEnd || discountStart || discountEnd || grossStart || grossEnd || netStart || netEnd || vatStart || vatEnd || totalAmountStart || totalAmountEnd) {
			pricingFilters['$and'] = [];
		}

		//quantity filter
		if (quantityStart) {
			pricingFilters["$and"].push({ quantity: { $gte: quantityStart } });
		}
		if (quantityEnd) {
			pricingFilters["$and"].push({ quantity: { $lte: quantityEnd } });
		}

		//discount filter
		if (discountStart) {
			pricingFilters["$and"].push({ totalDiscount: { $gte: discountStart } });
		}
		if (discountEnd) {
			pricingFilters["$and"].push({ totalDiscount: { $lte: discountEnd } });
		}

		//gross sale filter
		if (grossStart) {
			pricingFilters["$and"].push({ grossSale: { $gte: grossStart } });
		}
		if (grossEnd) {
			pricingFilters["$and"].push({ grossSale: { $lte: grossEnd } });
		}

		//net price filter
		if (netStart) {
			pricingFilters["$and"].push({ netSale: { $gte: netStart } });
		} /* else {
			pricingFilters["$and"].push({ netSale: { $gt: 0 } });
		} */
		if (netEnd) {
			pricingFilters["$and"].push({ netSale: { $lte: netEnd } });
		}

		//vat amount filter
		if (vatStart) {
			pricingFilters["$and"].push({ vatAmount: { $gte: vatStart } });
		}
		if (vatEnd) {
			pricingFilters["$and"].push({ vatAmount: { $lte: vatEnd } });
		}

		//total amount filter
		if (totalAmountStart) {
			pricingFilters["$and"].push({ totalAmount: { $gte: totalAmountStart } });
		}
		if (totalAmountEnd) {
			pricingFilters["$and"].push({ totalAmount: { $lte: totalAmountEnd } });
		}

		// Fetching sale
		const total_sales_refunded = await ALL_MODELS.orderItems.aggregate([
			// Match
			{ $match: { Refunded: true } },
			// lookup seller
			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},
			{ $unwind: "$seller" },
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
			{ $unwind: "$pv" },
			{
				$addFields: {
					refundedAmount: { $cond: { if: { $ne: ["$RefundedAmount", ""] }, then: { $toDouble: { $toString: "$RefundedAmount" } }, else: 0 } }
				}
			},
			{
				$addFields: {
					totalAmount: {
						$subtract: [
							{ $toDouble: { $toString: "$retailPrice" } },
							{ $add: ["$totalDiscount", "$refundedAmount"] }
						]
					},
				}
			},
			{
				$project: {
					sellerEnglish: "$seller.nameOfBussinessEnglish",
					sellerArabic: "$seller.nameOfBussinessEnglish",
					sellerIndexNo: "$seller.indexNo",
					createdDate: "$orders.createdAt",
					quantity: 1,
					totalAmount: 1,
					refundedReason: "$RefundedComment",
					refundedChargesPaidBy: "$RefundChargesPaidBy",
					refundedTo: "$RefundedTo",

					netPrice: "$retailPrice",
					totalDiscount: "$totalDiscount",
					offerDiscount: "$offerDiscount",
					refundedAmount: 1,

					vatAmount: { $multiply: [{ $subtract: [{ $toDouble: { $toString: "$retailPrice" } }, { $add: ["$totalDiscount", "$refundedAmount"] }] }, { $divide: [{ $toDouble: { $toString: "$pv.productTaxPercentage" } }, 100] }] },

					grossSale: { $subtract: ["$totalAmount", { $multiply: [{ $subtract: [{ $toDouble: { $toString: "$retailPrice" } }, { $add: ["$totalDiscount", "$refundedAmount"] }] }, { $divide: [{ $toDouble: { $toString: "$pv.productTaxPercentage" } }, 100] }] }] },
					//grossSale: { $multiply: [{ $toDouble: { $toString: "$retailPrice" } }, "$quantity"] },
					// netSale: { $subtract: [{ $multiply: [{ $toDouble: { $toString: "$retailPrice" } }, "$quantity"] }, "$totalDiscount"] }
					netSale: {
						$subtract: [
							"$grandTotal",
							{
								$add: ["$totalDiscount", "$refundedAmount"]
							}
						]
					}
				},
			},
			{
				$group: {
					_id: "$sellerIndexNo",
					sellerEnglish: { $first: "$sellerEnglish" },
					sellerArabic: { $first: "$sellerArabic" },
					quantity: { $sum: "$quantity" },
					totalAmount: { $sum: "$totalAmount" },
					netPrice: { $sum: "$netPrice" },
					totalDiscount: { $sum: "$totalDiscount" },
					offerDiscount: { $sum: "$offerDiscount" },
					refundedAmount: { $sum: "$refundedAmount" },
					vatAmount: { $sum: "$vatAmount" },
					grossSale: { $sum: "$grossSale" },
					netSale: { $sum: "$netSale" },
				}
			},
			{ $match: pricingFilters },
			{ $match: Searchfilter },
			{ $sort: { _id: -1 } }
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < total_sales_refunded.length; index++) {
			const element = total_sales_refunded[index];

			excelExportData.push({
				Seller: element.sellerEnglish,
				Quantity: element.quantity,
				Discount: element.totalDiscount,
				GrossSale: element.grossSale,
				NetSale: element.netSale,
				VatAmount: element.vatAmount,
				TotalAmount: element.totalAmount,
				RefundedAmount: element.refundedAmount,
			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}total_sales_refund_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Total Sales Refund Report",
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

module.exports = { total_sales_refunded_report, total_sales_refunded_report_excel };
