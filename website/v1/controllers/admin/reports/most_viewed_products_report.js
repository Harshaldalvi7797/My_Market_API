// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require('xlsx');
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

exports.most_viewed_products_report = async (req, res, next) => {
	let { search, limit, page, views_start, views_end, start_date, end_date } = req.body;

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
		let dateFilter = {};

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setDate(defaultDate.getDate() - 7);

		if (start_date)
			dateFilter.updatedAt = { $gte: new Date(start_date) }
		if (end_date)
			dateFilter.updatedAt = { $lte: new Date(end_date) }
		if (start_date && end_date) {
			dateFilter.updatedAt = {
				$gte: new Date(start_date),
				$lte: new Date(end_date)
			}
		}
		// Going to apply defalult 7 date dateFilter
		if (!start_date)
			dateFilter.updatedAt = { $gte: defaultDate }

		// Filter
		let filter = { $and: [] };

		let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
				{ "nameOfBussinessEnglish": regexp },
				{ "category.categoryDetails.categoryName": regexp },
			];
			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				searchFilter["$or"].push({ "count": parseFloat(search) });
			}
		}

		/**
		 * Filtering
		 */
		// Filter According to Views
		if (views_start) {
			filter["$and"].push({ count: { $gte: parseInt(views_start) } });
		} else {
			filter["$and"].push({ count: { $gte: 0 } });
		}

		if (views_end) {
			filter["$and"].push({ count: { $lte: parseInt(views_end) } });
		}

		// Fetching sale
		const most_viewed = await ALL_MODELS.visitorsModel.aggregate([
			{ $match: dateFilter },
			// lookup
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariant",
				},
			},
			{ $unwind: "$productvariant" },
			{
				$lookup: {
					from: "products",
					localField: "productvariant.productId",
					foreignField: "_id",
					as: "product",
				},
			},
			{
				$lookup: {
					from: "categories",
					localField: "product.productCategories.categoryLevel1Id",
					foreignField: "_id",
					as: "category",
				},
			},
			{ $unwind: "$category" },
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
				$group:
				{
					_id: "$productVariantId",
					nameOfBussinessEnglish: { $first: "$seller.nameOfBussinessEnglish" },
					seller: { $first: "$seller.sellerDetails" },
					productVariantDetails: { $first: "$productvariant.productVariantDetails" },
					clickCount: { $sum: "$clickCount" },
					viewsCount: { $sum: "$viewsCount" },
					category: { $first: "$category" }
				}
			},
			{
				$project:
				{
					_id: 1,
					productVariantDetails: 1,
					category: 1,
					nameOfBussinessEnglish: 1,
					seller: 1,
					count:
					{
						$add: ["$clickCount", "$viewsCount"]
					}
				}
			},
			{ $match: searchFilter },
			{ $match: filter },
			// {
			// 	$addFields:{
			// 	  totalAmount: { $add: ["$clickCount", "$clickCount"] }
			// 	}
			//  },
			// {
			// 	$project: {
			// 		productvariant: "$productvariant.productVariantDetails",
			// 		product: 1,
			// 		count: { $toInt: "$count" },
			// 		sellerId: 1,
			// 		seller: "$seller.sellerDetails",
			// 		nameOfBusiness: "$seller.nameOfBussinessEnglish",
			// 		category: 1,
			// 	},
			// }
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
			totalCount = most_viewed[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: most_viewed.length ? most_viewed[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of most_viewed_report

exports.mostViewProductExcel = async (req, res) => {
	let { search, views_start, views_end, start_date, end_date } = req.body;
	try {
		// Filter
		let dateFilter = {};

		/**
		 * Filtering according to date
		 */
		const defaultDate = new Date();
		defaultDate.setDate(defaultDate.getDate() - 7);

		if (start_date)
			dateFilter.updatedAt = { $gte: new Date(start_date) }
		if (end_date)
			dateFilter.updatedAt = { $lte: new Date(end_date) }
		if (start_date && end_date) {
			dateFilter.updatedAt = {
				$gte: new Date(start_date),
				$lte: new Date(end_date)
			}
		}
		// Going to apply defalult 7 date dateFilter
		if (!start_date)
			dateFilter.updatedAt = { $gte: defaultDate }

		// Filter
		let filter = { $and: [] };

		let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
				{ "nameOfBussinessEnglish": regexp },
				{ "category.categoryDetails.categoryName": regexp },
			];
			if (parseFloat(search).toString().toLowerCase() != 'nan') {
				searchFilter["$or"].push({ "count": parseFloat(search) });
			}
		}

		/**
		 * Filtering
		 */
		// Filter According to Views
		if (views_start) {
			filter["$and"].push({ count: { $gte: parseInt(views_start) } });
		} else {
			filter["$and"].push({ count: { $gte: 0 } });
		}

		if (views_end) {
			filter["$and"].push({ count: { $lte: parseInt(views_end) } });
		}

		// Fetching sale
		const most_viewed = await ALL_MODELS.visitorsModel.aggregate([
			// Match 
			{ $match: dateFilter },
			// lookup
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariant",
				},
			},
			{ $unwind: "$productvariant" },
			{
				$lookup: {
					from: "products",
					localField: "productvariant.productId",
					foreignField: "_id",
					as: "product",
				},
			},
			{
				$lookup: {
					from: "categories",
					localField: "product.productCategories.categoryLevel1Id",
					foreignField: "_id",
					as: "category",
				},
			},
			{ $unwind: "$category" },
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
				$group:
				{
					_id: "$productVariantId",
					nameOfBussinessEnglish: { $first: "$seller.nameOfBussinessEnglish" },
					seller: { $first: "$seller.sellerDetails" },
					productVariantDetails: { $first: "$productvariant.productVariantDetails" },
					clickCount: { $sum: "$clickCount" },
					viewsCount: { $sum: "$viewsCount" },
					category: { $first: "$category" }
				}
			},
			{
				$project:
				{
					_id: 1,
					productVariantDetails: 1,
					category: 1,
					nameOfBussinessEnglish: 1,
					seller: 1,
					count:
					{
						$add: ["$clickCount", "$viewsCount"]
					}
				}
			},
			{ $match: searchFilter },
			{ $match: filter },
		]);

		// console.log(JSON.stringify(most_viewed))

		var wb = XLSX.utils.book_new(); //new workbook

		let excelExportData = []

		for (let index = 0; index < most_viewed.length; index++) {
			const element = most_viewed[index];

			let a = {
				SellerName: element.seller.sellerfName,
				ProductVariantNameEnglish: null,
				ProductVariantNameArabic: null,
				CategoryNameEnglish: null,
				CategoryNameArabic: null,
				Views: element.count,
			};
			for (let i = 0; i < element.productVariantDetails.length; i++) {
				const ele = element.productVariantDetails[i];

				if (i == 0) {
					a.ProductVariantNameEnglish = ele.productVariantName;
				}
				else if (i == 1) {
					a.ProductVariantNameArabic = ele.productVariantName;
				}
			}
			for (let i = 0; i < element.category.categoryDetails.length; i++) {
				const eleCat = element.category.categoryDetails[i];
				// console.log("eleCat", eleCat)

				if (i == 0) {
					a.CategoryNameEnglish = eleCat.categoryName;
				}
				else if (i == 1) {
					a.CategoryNameArabic = eleCat.categoryName;
				}
			}
			excelExportData.push(a)
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();
		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);
		var down = `${folder}most-viewed-product-report${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);
		let newReport = new ALL_MODELS.reportModel({
			adminId: req.userId,
			ReportName: "Most Viewed Product Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
		})

		let data = await newReport.save()
		return res.send({ message: "Your download will begin now.", d: data }) //

		//return res.send({ count: most_viewed.length, data: excelExportData })
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
}

