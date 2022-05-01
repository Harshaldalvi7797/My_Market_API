// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('../../../middlewares/checkCreateFolder');

const most_viewed_report = async (req, res, next) => {
	let { search, limit, page, views_start, views_end, startDate,
		endDate, } = req.body;

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
		const filter = {};
		const dateFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "productvariant.productVariantName": regexp },
				{ "category.categoryDetails.categoryName": regexp },
			];
			if (parseInt(search) != NaN) {
				filter["$or"].push({ "count": parseInt(search) })
			}
		}
		if (views_start || views_start) {
			filter["$and"] = [];
		}
		if (views_start) {
			filter["$and"].push({ count: { $gte: parseInt(views_start) } });
		}

		if (views_end) {
			filter["$and"].push({ count: { $lte: parseInt(views_end) } });
		}
		const defaultDate = new Date();
		defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 1);

		if (startDate) {
			if (!dateFilter['$and']) { dateFilter['$and'] = [] }
			startDate = new Date(startDate)
			startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
			startDate.setDate(startDate.getDate() - 1)
			let dt = convertDateTime(startDate);
			dateFilter['$and'].push({ "createdDate": { $gte: dt } })
		}
		if (endDate) {
			if (!dateFilter['$and']) { dateFilter['$and'] = [] }
			endDate = new Date(endDate)
			endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
			let dt = convertDateTime(endDate);
			dateFilter['$and'].push({ "createdDate": { $lte: dt } })
		}
		if (!startDate) {
			if (!dateFilter['$and']) { dateFilter['$and'] = [] }
			let dt = convertDateTime(defaultDate);
			dateFilter['$and'].push({ "createdDate": { $gte: dt } })
		}

		// console.log(JSON.stringify(filter))
		console.log(JSON.stringify(dateFilter))
		// Fetching sale
		const most_viewed = await ALL_MODELS.visitorsModel.aggregate([
			// Match
			{ $match: { sellerId: sellerId } },
			{ $sort: { createdAt: -1 } },
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
				$project: {
					productVariantId: 1,
					productvariant: "$productvariant.productVariantDetails",
					product: 1,
					// count: { $toInt: "$count" },
					count: { $add: ["$viewsCount"] },
					createdDate: 1,
					sellerId: 1,
					productCategory: { $first: "$product.productCategories" },
				}
			},
			{
				$group: {
					_id: "$productVariantId",
					productvariant: { $first: "$productvariant" },
					product: { $first: "$product" },
					count: { $sum: "$count" },
					sellerId: { $first: "$sellerId" },
					productCategory: { $first: "$productCategory" },
				}
			},

			{ $unwind: "$productCategory" },
			{
				$lookup: {
					from: "categories",
					localField: "productCategory.categoryLevel1Id",
					foreignField: "_id",
					as: "category",
				},
			},
			{
				$project: {
					product: 0,
					productCategory: 0,
					"category.active": 0,
					"category.adminApproval": 0,
					"category.parentCategoryId": 0,
					"category.categorySpecifications": 0,
					"category.isParent": 0,
					"category.categoryLevel": 0,
					"category.categoryThumbnailImage": 0,
					"category.createdAt": 0,
					"category.updatedAt": 0,
					"category.createdDate": 0,
					"category.updatedDate": 0,
					"category.indexNo": 0,
					"category.__v": 0,
				},
			},
			{ $unwind: "$category" },
			{ $match: filter },
			{ $sort: { count: -1 } },
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

		const most_viewedList = most_viewed.length ? most_viewed[0].paginatedResults : [];
		let totalCount = 0
		try {
			totalCount = most_viewed[0].totalCount[0].count
		} catch (err) { }
		return res.send({ totalCount: totalCount, count: most_viewedList.length, data: most_viewedList });

	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of most_viewed_report

const most_viewed_report_excel = async (req, res, next) => {
	let { search, limit, page, views_start, views_end, startDate,
		endDate, } = req.body;

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
		const filter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "productvariant.productVariantName": regexp },
				{ "category.categoryDetails.categoryName": regexp },
			];
			if (parseInt(search) != NaN) {
				filter["$or"].push({ "count": parseInt(search) })
			}
		}
		if (views_start || views_start || startDate || endDate) {
			filter["$and"] = [];
		}
		if (views_start) {
			filter["$and"].push({ count: { $gte: parseInt(views_start) } });
		}

		if (views_end) {
			filter["$and"].push({ count: { $lte: parseInt(views_end) } });
		}
		const defaultDate = new Date();
		defaultDate.setHours(00); defaultDate.setMinutes(00); defaultDate.setSeconds(00);
		defaultDate.setMonth(defaultDate.getMonth() - 1);

		if (startDate) {
			startDate = new Date(startDate)
			startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
			startDate.setDate(startDate.getDate() - 1)
			let dt = convertDateTime(startDate);
			filter['$and'].push({ "createdDate": { $gte: dt } })
		}
		if (endDate) {
			endDate = new Date(endDate)
			endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
			let dt = convertDateTime(endDate);
			filter['$and'].push({ "createdDate": { $lte: dt } })
		}
		// if (!startDate) {
		// 	let dt = convertDateTime(defaultDate);
		// 	filter['$and'].push({ "createdDate": { $gte: dt } })
		// }
		// Fetching sale
		const most_viewed = await ALL_MODELS.visitorsModel.aggregate([
			// lookup
			{
				$lookup: {
					from: "productvariants",
					localField: "productVariantId",
					foreignField: "_id",
					as: "productvariant",
				},
			},

			// Match
			{ $match: { sellerId: sellerId } },
			{ $sort: { createdAt: -1 } },
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
				$project: {
					productvariant: "$productvariant.productVariantDetails",
					product: 1,
					count: { $toInt: "$count" },
					createdDate: 1,
					sellerId: 1,
					productCategory: { $first: "$product.productCategories" },
				},
			},

			{ $unwind: "$productCategory" },
			{
				$lookup: {
					from: "categories",
					localField: "productCategory.categoryLevel1Id",
					foreignField: "_id",
					as: "category",
				},
			},
			{
				$project: {
					product: 0,
					productCategory: 0,
				},
			},
			{ $unwind: "$category" },
			{ $match: filter }
		]);

		// console.log("most_viewed", most_viewed)

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < most_viewed.length; index++) {
			const element = most_viewed[index];
			//  console.log("element", element)
			let a = {


				ProductVariantNameEnglish: null,
				ProductVariantNameArabic: null,
				CategoryLevel1English: null,
				CategoryLevel1Arabic: null,
				count: element.count
			};
			for (let i = 0; i < element.productvariant.length; i++) {
				const ele = element.productvariant[i];
				//	 console.log("el", ele)
				if (i == 0) {
					a.ProductVariantNameEnglish = ele.productVariantName;
				}
				else if (i == 1) {
					a.ProductVariantNameArabic = ele.productVariantName;
				}
			}

			for (let index = 0; index < element.category.categoryDetails.length; index++) {
				const elc = element.category.categoryDetails[index];
				// console.log("elc",elc)

				if (index == 0) {
					a.CategoryLevel1English = elc.categoryName;
				}
				else if (index == 1) {
					a.CategoryLevel1Arabic = elc.categoryName;
				}
			}
			excelExportData.push(a)
			// excelExportData.push({
			// 	productvariant: element.productvariant[0].productVariantName,
			// 	category: element.category.categoryDetails[0].categoryName,
			// 	count: element.count,
			// });
		}
		// excelExportData.push(most_viewed)
		// console.log("excelExportData", excelExportData)
		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}most_viewed_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Most Viewed Report",
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
}; // End of most_viewed_report excel

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

module.exports = { most_viewed_report, most_viewed_report_excel };
