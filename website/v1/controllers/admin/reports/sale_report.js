const path = require("path");
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

const sale_report = async (req, res, next) => {
	const { start_date, end_date, discount_start, discount_end, gross_sale_start,
		gross_sale_end, net_sale_start, net_sale_end, vat_amount_start,
		vat_amount_end, total_amount_start, total_amount_end, search } = req.body;

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

		/*** Filtering according to date */

		if (start_date) {
			dateFilter['$and'].push({ "order.createdDate": { $gte: convertDateTime(new Date(start_date)) } });
		}
		if (end_date) {
			dateFilter['$and'].push({ "order.createdDate": { $lte: convertDateTime(new Date(end_date)) } });
		}

		// Going to apply defalult today date filter
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		if (!start_date) { dateFilter['$and'].push({ "order.createdDate": { $gte: convertDateTime(new Date(defaultDate)) } }) }

		/** * Search */
		if (search) {
			let regexSearch = new RegExp(search, "i");
			filter["$or"] = [];
			filter["$or"].push({ seller: regexSearch });
			filter["$or"].push({ paymentType: regexSearch });
			filter["$or"].push({ 'category.categoryName': regexSearch });
			filter["$or"].push({ 'productVariantName.productVariantName': regexSearch });

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				filter["$or"].push({ quantity: parseInt(search) });
				filter["$or"].push({ 'discounts.totalDiscount': parseFloat(search) });
				filter["$or"].push({ RefundedAmount: parseFloat(search) });
				filter["$or"].push({ RefundedTaxAmount: parseFloat(search) });
				filter["$or"].push({ NetSales: parseFloat(search) });
				filter["$or"].push({ VatAmount: parseFloat(search) });
				filter["$or"].push({ VATPercentage: parseFloat(search) });
				filter["$or"].push({ GrossSale: parseFloat(search) });
				filter["$or"].push({ totalAmount: parseFloat(search) });
				filter["$or"].push({ orderIndexNo: parseInt(search) });
			}
		}

		/** * Filtering */

		// gross sale
		if (gross_sale_start)
			filter.GrossSale = { $gte: gross_sale_start };
		if (gross_sale_end)
			filter.GrossSale = { $lte: gross_sale_end };
		if (gross_sale_start && gross_sale_end) {
			filter.GrossSale = {
				$gte: gross_sale_start,
				$lte: gross_sale_end,
			};
		} // End of gross sale

		// net_sale
		if (net_sale_start) filter.NetSales = { $gte: net_sale_start };
		if (net_sale_end) filter.NetSales = { $lte: net_sale_end };
		if (net_sale_start && net_sale_end) {
			filter.NetSales = {
				$gte: net_sale_start,
				$lte: net_sale_end,
			};
		}
		// End of net_sale

		// vat_amount
		if (vat_amount_start) filter.VatAmount = { $gte: vat_amount_start };
		if (vat_amount_end) filter.VatAmount = { $lte: vat_amount_end };
		if (vat_amount_start && vat_amount_end) {
			filter.VatAmount = {
				$gte: vat_amount_start,
				$lte: vat_amount_end,
			};
		} // End of vat_amount

		// total_amount
		if (total_amount_start)
			filter.totalAmount = { $gte: total_amount_start };
		if (total_amount_end) filter.totalAmount = { $lte: total_amount_end };
		if (total_amount_start && total_amount_end) {
			filter.totalAmount = {
				$gte: total_amount_start,
				$lte: total_amount_end,
			};
		} // End of total_amount

		// discount
		if (discount_start)
			filter["discounts.totalDiscount"] = { $gte: discount_start };
		if (discount_end) filter["discounts.totalDiscount"] = { $lte: discount_end };
		if (discount_start && discount_end) {
			filter["discounts.totalDiscount"] = {
				$gte: discount_start,
				$lte: discount_end,
			};
		} // End of discount

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
					productVariantName: "$productVariantDetails",
					category: { $first: "$categoriesName.categoryDetails" },
					seller: "$seller.nameOfBussinessEnglish",

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
					// total: { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] },
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
}; // End of sale_report

const sale_report_excel = async (req, res, next) => {
	const { start_date, end_date, discount_start, discount_end, gross_sale_start,
		gross_sale_end, net_sale_start, net_sale_end, vat_amount_start,
		vat_amount_end, total_amount_start, total_amount_end, search } = req.body;

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

		// Going to apply defalult today date filter
		const defaultDate = new Date();
		defaultDate.setHours(00);
		defaultDate.setMinutes(00);
		defaultDate.setSeconds(00);
		if (!start_date) { dateFilter['$and'].push({ "order.createdDate": { $gte: convertDateTime(new Date(defaultDate)) } }) }

		/** * Search */
		if (search) {
			let regexSearch = new RegExp(search, "i");
			filter["$or"] = [];
			filter["$or"].push({ seller: regexSearch });
			filter["$or"].push({ paymentType: regexSearch });
			filter["$or"].push({ 'category.categoryName': regexSearch });
			filter["$or"].push({ 'productVariantName.productVariantName': regexSearch });

			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				filter["$or"].push({ quantity: parseInt(search) });
				filter["$or"].push({ 'discounts.totalDiscount': parseFloat(search) });
				filter["$or"].push({ RefundedAmount: parseFloat(search) });
				filter["$or"].push({ RefundedTaxAmount: parseFloat(search) });
				filter["$or"].push({ NetSales: parseFloat(search) });
				filter["$or"].push({ VatAmount: parseFloat(search) });
				filter["$or"].push({ VATPercentage: parseFloat(search) });
				filter["$or"].push({ GrossSale: parseFloat(search) });
				filter["$or"].push({ totalAmount: parseFloat(search) });
				filter["$or"].push({ orderIndexNo: parseInt(search) });
			}
		}

		/** * Filtering */

		// gross sale
		if (gross_sale_start)
			filter.GrossSale = { $gte: gross_sale_start };
		if (gross_sale_end)
			filter.GrossSale = { $lte: gross_sale_end };
		if (gross_sale_start && gross_sale_end) {
			filter.GrossSale = {
				$gte: gross_sale_start,
				$lte: gross_sale_end,
			};
		} // End of gross sale

		// net_sale
		if (net_sale_start) filter.NetSales = { $gte: net_sale_start };
		if (net_sale_end) filter.NetSales = { $lte: net_sale_end };
		if (net_sale_start && net_sale_end) {
			filter.NetSales = {
				$gte: net_sale_start,
				$lte: net_sale_end,
			};
		}
		// End of net_sale

		// vat_amount
		if (vat_amount_start) filter.VatAmount = { $gte: vat_amount_start };
		if (vat_amount_end) filter.VatAmount = { $lte: vat_amount_end };
		if (vat_amount_start && vat_amount_end) {
			filter.VatAmount = {
				$gte: vat_amount_start,
				$lte: vat_amount_end,
			};
		} // End of vat_amount

		// total_amount
		if (total_amount_start)
			filter.totalAmount = { $gte: total_amount_start };
		if (total_amount_end) filter.totalAmount = { $lte: total_amount_end };
		if (total_amount_start && total_amount_end) {
			filter.totalAmount = {
				$gte: total_amount_start,
				$lte: total_amount_end,
			};
		} // End of total_amount

		// discount
		if (discount_start)
			filter["discounts.totalDiscount"] = { $gte: discount_start };
		if (discount_end) filter["discounts.totalDiscount"] = { $lte: discount_end };
		if (discount_start && discount_end) {
			filter["discounts.totalDiscount"] = {
				$gte: discount_start,
				$lte: discount_end,
			};
		} // End of discount

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
					productVariantName: "$productVariantDetails",
					category: { $first: "$categoriesName.categoryDetails" },
					seller: "$seller.nameOfBussinessEnglish",

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
					// total: { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] },
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
			{ $match: filter }
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < sales.length; index++) {
			const element = sales[index];

			let orderDate = new Date(element.orderDate);
			excelExportData.push({
				"Order#": element.orderIndexNo,
				Date: `${orderDate.toUTCString().toString().slice(0, 16)} ${orderDate.toLocaleString().toString().slice(10)}`,
				Seller: element.seller,
				categoryEnglish: element.category[0].categoryName,
				categoryArabic: element.category[1].categoryName,
				ProductVariantNameEnglish: element.productVariantName[0].productVariantName,
				ProductVariantNameArabic: element.productVariantName[1].productVariantName,
				Quantity: element.quantity,
				Discount: element.discounts.totalDiscount,
				RefundedAmount: element.RefundedAmount,
				RefundedTaxAmount: element.RefundedTaxAmount,
				GrossSale: element.GrossSale,
				NetSale: element.NetSales,
				VatAmount: element.VatAmount,
				TotalAmount: element.totalAmount,
				PaymentMethod: element.paymentType,

			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}sale_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Sale Report",
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

module.exports = { sale_report, sale_report_excel };
