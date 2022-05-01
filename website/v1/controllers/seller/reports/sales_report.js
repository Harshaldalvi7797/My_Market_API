// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

exports.sales_report = async (req, res, next) => {
	let {
		start_date,
		end_date,
		search,
		gross_sale_start,
		gross_sale_end,
		net_sale_start,
		net_sale_end,
		vat_amount_start,
		vat_amount_end,
		discount_start,
		discount_end,
		limit,
		page,
	} = req.body;

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
		const sellerId = ObjectId(req.userId);

		const filter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "productVariantName.productVariantName": regexp },
				{ "paymentType": regexp }
			];
			if (parseFloat(search) != NaN) {
				filter["$or"].push({ "indexNo": parseFloat(search) });
				filter["$or"].push({ "quantity": parseFloat(search) });
				filter["$or"].push({ "RefundedAmount": parseFloat(search) });
				filter["$or"].push({ "productNetPrice": parseFloat(search) });
				filter["$or"].push({ "RefundedTaxAmount": parseFloat(search) });
				filter["$or"].push({ "GrossSale": parseFloat(search) });
				filter["$or"].push({ "VATPercentage": parseFloat(search) });
				filter["$or"].push({ "VatAmount": parseFloat(search) });
				filter["$or"].push({ "NateSales": parseFloat(search) });
				filter["$or"].push({ "discounts.totalDiscount": parseFloat(search) });
			}
		}
		if (start_date || end_date || gross_sale_start || gross_sale_end || net_sale_start || net_sale_end
			|| vat_amount_start || vat_amount_end || discount_start || discount_end
		) {
			filter["$and"] = [];
		}

		if (gross_sale_start) { filter["$and"].push({ GrossSale: { $gte: parseInt(gross_sale_start) } }); }
		if (gross_sale_end) { filter["$and"].push({ GrossSale: { $lte: parseInt(gross_sale_end) } }); }
		if (net_sale_start) { filter["$and"].push({ NateSales: { $gte: parseInt(net_sale_start) } }); }
		if (net_sale_end) { filter["$and"].push({ NateSales: { $lte: parseInt(net_sale_end) } }); }
		if (vat_amount_start) { filter["$and"].push({ VatAmount: { $gte: parseInt(vat_amount_start) } }); }
		if (vat_amount_end) { filter["$and"].push({ VatAmount: { $lte: parseInt(vat_amount_end) } }); }
		if (discount_start) { filter["$and"].push({ "discounts.totalDiscount": { $gte: parseInt(discount_start) } }); }
		if (discount_end) { filter["$and"].push({ "discounts.totalDiscount": { $lte: parseInt(discount_end) } }); }

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
			// end_date.setDate(end_date.getDate() + 1)
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
		const sales = await ALL_MODELS.orderItems.aggregate([
			{ $match: { sellerId: sellerId } },
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
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
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
					indexNo: "$order.indexNo",
					productVariantName: "$productVariantDetails",

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
					paymentType: "$order.paymentMethod",
				},

			},
			{
				$sort: { indexNo: -1 }
			},
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

		const salesList = sales.length ? sales[0].paginatedResults : [];

		let totalCount = 0
		try {
			totalCount = sales[0].totalCount[0].count
		} catch (err) { }
		return res.send({ totalCount: totalCount, count: salesList.length, data: salesList });
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of sales_report

exports.sales_report_excel = async (req, res) => {
	let {
		start_date,
		end_date,
		search,
		gross_sale_start,
		gross_sale_end,
		net_sale_start,
		net_sale_end,
		vat_amount_start,
		vat_amount_end,
		discount_start,
		discount_end,
		limit,
		page,
	} = req.body;

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
		const sellerId = ObjectId(req.userId);
		const filter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			filter["$or"] = [
				{ "productVariantName.productVariantName": regexp },
				{ "paymentType": regexp }
			];
			if (parseFloat(search) != NaN) {
				filter["$or"].push({ "indexNo": parseFloat(search) });
				filter["$or"].push({ "quantity": parseFloat(search) });
				filter["$or"].push({ "RefundedAmount": parseFloat(search) });
				filter["$or"].push({ "productNetPrice": parseFloat(search) });
				filter["$or"].push({ "RefundedTaxAmount": parseFloat(search) });
				filter["$or"].push({ "GrossSale": parseFloat(search) });
				filter["$or"].push({ "VATPercentage": parseFloat(search) });
				filter["$or"].push({ "VatAmount": parseFloat(search) });
				filter["$or"].push({ "NateSales": parseFloat(search) });
				filter["$or"].push({ "discounts.totalDiscount": parseFloat(search) });
			}
		}
		if (start_date || end_date || gross_sale_start || gross_sale_end || net_sale_start || net_sale_end
			|| vat_amount_start || vat_amount_end || discount_start || discount_end
		) {
			filter["$and"] = [];
		}

		if (gross_sale_start) { filter["$and"].push({ GrossSale: { $gte: parseInt(gross_sale_start) } }); }
		if (gross_sale_end) { filter["$and"].push({ GrossSale: { $lte: parseInt(gross_sale_end) } }); }
		if (net_sale_start) { filter["$and"].push({ NateSales: { $gte: parseInt(net_sale_start) } }); }
		if (net_sale_end) { filter["$and"].push({ NateSales: { $lte: parseInt(net_sale_end) } }); }
		if (vat_amount_start) { filter["$and"].push({ VatAmount: { $gte: parseInt(vat_amount_start) } }); }
		if (vat_amount_end) { filter["$and"].push({ VatAmount: { $lte: parseInt(vat_amount_end) } }); }
		if (discount_start) { filter["$and"].push({ "discounts.totalDiscount": { $gte: parseInt(discount_start) } }); }
		if (discount_end) { filter["$and"].push({ "discounts.totalDiscount": { $lte: parseInt(discount_end) } }); }

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

		// Fetching sale
		const sales = await ALL_MODELS.orderItems.aggregate([
			{ $match: { sellerId: sellerId } },
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
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariants"
				}
			},
			{ $unwind: "$productvariants" },
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
					indexNo: "$order.indexNo",
					productVariantName: "$productVariantDetails",

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
					paymentType: "$order.paymentMethod",
				},

			},
			{ $match: filter }
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < sales.length; index++) {
			const element = sales[index];
			let a =
			{
				orderDate: element.createdAt,
				IndexNo: element.indexNo,
				ProductVariantNameEnglish: null,
				ProductVariantNameArabic: null,
				quantity: element.quantity,
				totalDiscount: element.discounts.totalDiscount,
				RefundedAmount: element.RefundedAmount,
				RefundedTaxAmount: element.RefundedTaxAmount,
				NateSales: element.NateSales,
				VatAmount: element.VatAmount,
				VATPercentage: element.VATPercentage,
				paymentType: element.paymentType,
				GrossSale: element.GrossSale
			}

			for (let i = 0; i < element.productVariantName.length; i++) {
				const ele = element.productVariantName[i];
				// console.log("el", ele)
				if (i == 0) {
					a.ProductVariantNameEnglish = ele.productVariantName;
				}
				else if (i == 1) {
					a.ProductVariantNameArabic = ele.productVariantName;
				}
			}
			excelExportData.push(a)
		}


		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}sales_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Sales Report",
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
}; // End of sales_report excel

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

