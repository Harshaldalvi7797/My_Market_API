const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

exports.tax_report = async (req, res, next) => {
	let {
		search,
		start_date,
		end_date,
		limit,
		page,
		netStart,
		netEnd,
		refundedStart,
		refundedEnd,
		vatAmountStart, vatAmountEnd,
		refundedTaxAmountStart, refundedTaxAmountEnd,
		calculatedTaxStart, calculatedTaxEnd
	} = req.body;


	if (!limit) { limit = 10 }
	if (!page) { page = 1 }

	let perPage = parseInt(limit)
	let pageNo = Math.max(0, parseInt(page))

	if (pageNo > 0) {
		pageNo = pageNo - 1;
	} else if (pageNo < 0) {
		pageNo = 0;
	}

	try {

		const filter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			filter["$or"] = [
				// { "productVariantName.productVariantName": regexp },
				// { "paymentType": regexp }
			];
			if (parseFloat(search) != NaN) {
				filter["$or"].push({ "NateSales": parseFloat(search) });
				filter["$or"].push({ "totalDiscount": parseFloat(search) });
				filter["$or"].push({ "RefundedAmount": parseFloat(search) });
				filter["$or"].push({ "RefundedTaxAmount": parseFloat(search) });
				filter["$or"].push({ "vatAmount": parseFloat(search) });
				filter["$or"].push({ "refundedTaxAmount": parseFloat(search) });
				filter["$or"].push({ "calculatedTax": parseFloat(search) });
				filter["$or"].push({ "orderIndexNo": parseFloat(search) });

			}
		}
		// console.log("filter", filter)
		// Filter
		if (start_date || end_date || netStart || netEnd || refundedStart || refundedEnd || vatAmountStart
			|| vatAmountEnd || refundedTaxAmountStart || refundedTaxAmountEnd) {
			filter["$and"] = [];
		}

		if (netStart) {
			filter["$and"].push({ NateSales: { $gt: netStart } });
		}
		if (netEnd) {
			filter["$and"].push({ NateSales: { $lt: netEnd } });
		}

		if (refundedStart) {
			filter["$and"].push({ refundedAmount: { $gt: refundedStart } });
		}
		if (refundedEnd) {
			filter["$and"].push({ refundedAmount: { $lt: refundedEnd } });
		}
		if (vatAmountStart) { filter["$and"].push({ VatAmount: { $gte: vatAmountStart } }); }
		if (vatAmountEnd) { filter["$and"].push({ VatAmount: { $lte: vatAmountEnd } }); }

		if (refundedTaxAmountStart)
			filter["$and"].push({ RefundedTaxAmount: { $gte: refundedTaxAmountStart } });
		if (refundedTaxAmountEnd)
			filter["$and"].push({ RefundedTaxAmount: { $lte: refundedTaxAmountEnd } });

		if (calculatedTaxStart) {
			filter["$and"].push({ CalculatedTax: { $gte: calculatedTaxStart } });
		}
		if (calculatedTaxEnd) {
			filter["$and"].push({ CalculatedTax: { $lte: calculatedTaxEnd } });
		}
		const defaultDate = new Date();
		defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 1);

		if (start_date) {
			start_date = new Date(start_date)
			start_date.setHours(23); start_date.setMinutes(59); start_date.setSeconds(59);
			// start_date.setDate(start_date.getDate() - 1)
			let dt = convertDateTime(start_date);
			filter['$and'].push({ "createdDate": { $gte: dt } })
		}
		if (end_date) {
			end_date = new Date(end_date)
			end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
			let dt = convertDateTime(end_date);
			filter['$and'].push({ "createdDate": { $lte: dt } })
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			if (!filter['$and']) { filter['$and'] = []; }
			filter['$and'].push({ "createdDate": { $gte: dt } })
		}
		// Fetching sale
		const sellerId = ObjectId(req.userId);
		const tax = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
			// Match
			// { $match: filter },
			{ $match: { sellerId: sellerId } },

			// group
			{
				$group: {
					_id: "$orderId",
					orderIndexNo: { $first: "$indexNo" },
					netPrice: { $first: "$retailPrice" },
					totalDiscount: {
						$first: "$totalDiscount"

					},
					retailPrice: { $first: "$retailPrice" },
					createdAt: { $first: "$order.createdAt" },
					createdDate: { $first: "$order.createdDate" },
					refundedAmount: { $first: "$RefundedAmount" },
					VATPercentage: { $first: { $toDouble: "$productvariants.productTaxPercentage" } },
					// NateSales: {
					// 	$subtract: [{ $first: { $toDouble: "$retailPrice" } }, { $add: [{ $first: "$totalDiscount" }, { $first: { $toDouble: "$RefundedAmount" } }] }]
					// },
					// totalAmount: {
					// 	$sum: { $toDouble: "$grandTotal" },
					// },

				},
			},
			{ $unwind: "$createdAt", },
			{ $unwind: "$createdDate", },
			{
				$project: {
					_id: 1,
					orderIndexNo: 1,
					// netPrice: 1,
					totalDiscount: 1,
					createdAt: 1,
					createdDate: 1,
					refundedAmount: { $toDouble: { $toString: "$refundedAmount" } },
					VATPercentage: 1,
					retailPrice: 1,
					NateSales: {
						$subtract: ["$retailPrice", { $add: ["$totalDiscount", { $toDouble: { $toString: "$refundedAmount" } }] }]
					},
					VatAmount: {
						$multiply: [{ $subtract: ["$retailPrice", { $add: ["$totalDiscount", { $toDouble: { $toString: "$refundedAmount" } }] }] }, { $divide: ["$VATPercentage", 100] }]
					},
					RefundedTaxAmount:
					{
						$multiply: [

							{ $toDouble: { $toString: "$refundedAmount" } },
							{ $divide: ["$VATPercentage", 100] }
						]
					},
					CalculatedTax:
					{
						$subtract: [
							{ $multiply: [{ $subtract: ["$retailPrice", { $add: ["$totalDiscount", { $toDouble: { $toString: "$refundedAmount" } }] }] }, { $divide: ["$VATPercentage", 100] }] },


							{
								$multiply: [

									{ $toDouble: { $toString: "$refundedAmount" } },
									{ $divide: ["$VATPercentage", 100] }
								]
							}
						]
					}
				}
			},
			{ $match: filter },
			{
				$facet: {
					paginatedResults: [
						{
							$skip: (perPage * pageNo),
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

		const taxList = tax.length ? tax[0].paginatedResults : [];

		let totalCount = 0
		try {
			totalCount = tax[0].totalCount[0].count
		} catch (err) { }
		return res.send({ totalCount: totalCount, count: taxList.length, data: taxList });

	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of tax_report

exports.tax_report_excel = async (req, res, next) => {
	let {
		search,
		start_date,
		end_date,
		limit,
		page,
		netStart,
		netEnd,
		refundedStart,
		refundedEnd,
		vatAmountStart, vatAmountEnd,
		refundedTaxAmountStart, refundedTaxAmountEnd,
		calculatedTaxStart, calculatedTaxEnd
	} = req.body;





	try {

		const filter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			filter["$or"] = [
				// { "productVariantName.productVariantName": regexp },
				// { "paymentType": regexp }
			];
			if (parseFloat(search) != NaN) {
				filter["$or"].push({ "NateSales": parseFloat(search) });
				filter["$or"].push({ "totalDiscount": parseFloat(search) });
				filter["$or"].push({ "RefundedAmount": parseFloat(search) });
				filter["$or"].push({ "RefundedTaxAmount": parseFloat(search) });
				filter["$or"].push({ "vatAmount": parseFloat(search) });
				filter["$or"].push({ "refundedTaxAmount": parseFloat(search) });
				filter["$or"].push({ "calculatedTax": parseFloat(search) });
				filter["$or"].push({ "orderIndexNo": parseFloat(search) });

			}
		}
		// console.log("filter", filter)
		// Filter
		if (start_date || end_date || netStart || netEnd || refundedStart || refundedEnd || vatAmountStart
			|| vatAmountEnd || refundedTaxAmountStart || refundedTaxAmountEnd) {
			filter["$and"] = [];
		}

		if (netStart) {
			filter["$and"].push({ NateSales: { $gt: netStart } });
		}
		if (netEnd) {
			filter["$and"].push({ NateSales: { $lt: netEnd } });
		}

		if (refundedStart) {
			filter["$and"].push({ refundedAmount: { $gt: refundedStart } });
		}
		if (refundedEnd) {
			filter["$and"].push({ refundedAmount: { $lt: refundedEnd } });
		}
		if (vatAmountStart) { filter["$and"].push({ VatAmount: { $gte: vatAmountStart } }); }
		if (vatAmountEnd) { filter["$and"].push({ VatAmount: { $lte: vatAmountEnd } }); }

		if (refundedTaxAmountStart)
			filter["$and"].push({ RefundedTaxAmount: { $gte: refundedTaxAmountStart } });
		if (refundedTaxAmountEnd)
			filter["$and"].push({ RefundedTaxAmount: { $lte: refundedTaxAmountEnd } });

		if (calculatedTaxStart) {
			filter["$and"].push({ CalculatedTax: { $gte: calculatedTaxStart } });
		}
		if (calculatedTaxEnd) {
			filter["$and"].push({ CalculatedTax: { $lte: calculatedTaxEnd } });
		}
		const defaultDate = new Date();
		defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 1);

		if (start_date) {
			start_date = new Date(start_date)
			start_date.setHours(23); start_date.setMinutes(59); start_date.setSeconds(59);
			start_date.setDate(start_date.getDate() - 1)
			let dt = convertDateTime(start_date);
			filter['$and'].push({ "createdDate": { $gte: dt } })
		}
		if (end_date) {
			end_date = new Date(end_date)
			end_date.setHours(23); end_date.setMinutes(59); end_date.setSeconds(59);
			let dt = convertDateTime(end_date);
			filter['$and'].push({ "createdDate": { $lte: dt } })
		}

		// Going to apply defalult 60 date filter
		if (!start_date) {
			let dt = convertDateTime(defaultDate);
			if (!filter['$and']) { filter['$and'] = []; }
			filter['$and'].push({ "createdDate": { $gte: dt } })
		}
		// console.log("filter", filter)
		// Filter


		// Fetching sale
		const sellerId = ObjectId(req.userId);
		const tax = await ALL_MODELS.orderItems.aggregate([
			// lookup
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order",
				},
			},
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
			// Match
			// { $match: filter },
			{ $match: { sellerId: sellerId } },

			// group
			{
				$group: {
					_id: "$orderId",
					orderIndexNo: { $first: "$indexNo" },
					netPrice: { $first: "$retailPrice" },
					totalDiscount: {
						$first: "$totalDiscount"

					},
					retailPrice: { $first: "$retailPrice" },
					createdAt: { $first: "$order.createdAt" },
					createdDate: { $first: "$order.createdDate" },
					refundedAmount: { $first: "$RefundedAmount" },
					VATPercentage: { $first: { $toDouble: "$productvariants.productTaxPercentage" } },
					// NateSales: {
					// 	$subtract: [{ $first: { $toDouble: "$retailPrice" } }, { $add: [{ $first: "$totalDiscount" }, { $first: { $toDouble: "$RefundedAmount" } }] }]
					// },
					// totalAmount: {
					// 	$sum: { $toDouble: "$grandTotal" },
					// },

				},
			},
			{
				$unwind: "$createdAt",

			},
			{
				$unwind: "$createdDate",

			},
			{
				$project: {
					_id: 1,
					orderIndexNo: 1,
					// netPrice: 1,
					totalDiscount: 1,
					createdAt: 1,
					createdDate: 1,
					refundedAmount: 1,
					VATPercentage: 1,
					retailPrice: 1,
					NateSales: {
						$subtract: ["$retailPrice", { $add: ["$totalDiscount", { $toDouble: "$refundedAmount" }] }]
					},
					// NateSales: {
					// 	$subtract: [{ $toDouble: "$retailPrice" }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }]
					// },

					VatAmount: {
						$multiply: [{ $subtract: ["$retailPrice", { $add: ["$totalDiscount", { $toDouble: "$refundedAmount" }] }] }, { $divide: ["$VATPercentage", 100] }]
					},
					RefundedTaxAmount:
					{
						$multiply: [

							{ $toDouble: "$refundedAmount" },
							{ $divide: ["$VATPercentage", 100] }
						]
					},
					CalculatedTax:
					{
						$subtract: [
							{ $multiply: [{ $subtract: ["$retailPrice", { $add: ["$totalDiscount", { $toDouble: "$refundedAmount" }] }] }, { $divide: ["$VATPercentage", 100] }] },


							{
								$multiply: [

									{ $toDouble: "$refundedAmount" },
									{ $divide: ["$VATPercentage", 100] }
								]
							}
						]
					}
				}
			}
			,
			{ $match: filter },
		]);
		// console.log(tax)

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < tax.length; index++) {
			const element = tax[index];

			excelExportData.push({
				orderIndexNo: element.orderIndexNo,
				NateSales: element.NateSales,
				refundedAmount: element.refundedAmount,
				RefundedTaxAmount: element.RefundedTaxAmount,
				VatAmount: element.VatAmount,
				refundedTaxAmount: element.refundedTaxAmount,
				CalculatedTax: element.CalculatedTax,
			});
		}
		// excelExportData.push(tax)

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}tax_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "tax Report",
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
}; // End of tax_report excel

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

