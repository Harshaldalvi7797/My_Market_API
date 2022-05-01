// Third party modules
const { ObjectId } = require("mongoose").Types;
var XLSX = require("xlsx");

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const delivery_report = async (req, res, next) => {
	let { search,
		startDate,
		endDate, limit, page, selectCountries, country } = req.body;
	if (!selectCountries || selectCountries.length === 0) {
		selectCountries = ["Bahrain", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates",];
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
		const sellerId = ObjectId(req.userId);
		const filter = {};
		let dateFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "productVariant.productVariantName": regexp },
				{ "address.country": regexp },
				{ "orderStatus.status": regexp },
				{ "address": regexp },
			];
			if (parseInt(search) != NaN) {
				filter["$or"].push({ "totalAmount": parseInt(search) }),
					filter["$or"].push({ "totalQuantityOrdered": parseInt(search) }),
					filter["$or"].push({ "orderIndexNo": parseInt(search) })
			}
		}
		// console.log(filter)
		if (country) {
			filter["$and"] = [];
		}

		if (startDate || endDate) {
			dateFilter["$and"] = [];
		}
		if (startDate) {
			startDate = new Date(startDate)
			startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
			startDate.setDate(startDate.getDate() - 1)
			let dt = convertDateTime(startDate);
			dateFilter['$and'].push({ createdDate: { $gte: dt } })
		}
		if (endDate) {
			endDate = new Date(endDate)
			endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(endDate);
			dateFilter['$and'].push({ createdDate: { $lte: dt } })
		}

		if (dateFilter['$and']) {
			dateFilter['$and'].push({ order: { $ne: null } });
		}
		// console.log("dateFilter", dateFilter)



		if (country) {
			filter["$and"].push({ "address.country": { $in: country } });
		}
		// console.log(JSON.stringify(filter))


		// Fetching sale
		const delivery = await ALL_MODELS.orderItems.aggregate([
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
			{ $match: dateFilter },

			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershippings",
				},
			},
			{
				$unwind: {
					path: "$ordershippings"
				}
			},
			{
				$match: {
					"ordershippings.sellerId": sellerId
				}
			},
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershippings._id",
					foreignField: "orderShippingId",
					as: "orderstatusupdates",
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
			// // group
			{
				$group: {
					_id: "$orderId",
					doc: { $first: "$$ROOT" },
					totalQuantityOrdered: {
						$sum: { $toDouble: "$quantity" },
					},
					totalAmount: {
						$sum: { $toDouble: "$grandTotal" },
					},
					orderStatus: {
						$last: "$orderstatusupdates"
					},
				},
			},
			{ $unwind: "$doc.order" },
			{
				$project: {
					seller: 1,
					orderId: "$doc.order._id",
					orderIndexNo: "$doc.order.indexNo",
					createdDate: "$doc.order.createdAt",
					productVariant: "$doc.productVariantDetails",
					totalQuantityOrdered: 1,
					totalAmount: 1,
					address: "$doc.order.customerDelhiveryDetails.shippingDetails",
					sellerId: "$doc.sellerId",
					ordershippings: "$ordershippings",
					orderStatus: [{ $last: "$orderStatus" }],
					currentStatus: { $last: "$orderStatus.status" }
				},
			},
			{ $match: { currentStatus: { $in: ["Shipped", "Ready_To_Pickup", "Delivered"] } } },
			{ $sort: { orderIndexNo: -1 } },
			// Match
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

		// return res.send({ count: delivery.length, data: delivery })
		const deliveryList = delivery.length ? delivery[0].paginatedResults : [];

		let totalCount = 0
		try {
			totalCount = delivery[0].totalCount[0].count
		} catch (err) { }
		return res.send({ totalCount: totalCount, count: deliveryList.length, data: deliveryList });
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
// End of delivery_report

const delivery_report_excel = async (req, res, next) => {
	let { search,
		startDate,
		endDate, country } = req.body;
	try {
		const sellerId = ObjectId(req.userId);
		const filter = {};
		let dateFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			//  regexp = new RegExp(category, "i");
			filter["$or"] = [
				{ "productVariant.productVariantName": regexp },
				{ "address.country": regexp },
			];
			if (parseInt(search) != NaN) {
				filter["$or"].push({ "totalAmount": parseInt(search) }),
					filter["$or"].push({ "totalQuantityOrdered": parseInt(search) })
			}
		}
		// console.log(filter)
		if (country) {
			filter["$and"] = [];
		}

		if (startDate || endDate) {
			dateFilter["$and"] = [];
		}
		if (startDate) {
			startDate = new Date(startDate)
			startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
			startDate.setDate(startDate.getDate() - 1)
			let dt = convertDateTime(startDate);
			dateFilter['$and'].push({ createdDate: { $gte: dt } })
		}
		if (endDate) {
			endDate = new Date(endDate)
			endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
			// end_date.setDate(end_date.getDate() + 1)
			let dt = convertDateTime(endDate);
			dateFilter['$and'].push({ createdDate: { $lte: dt } })
		}

		if (dateFilter['$and']) {
			dateFilter['$and'].push({ order: { $ne: null } });
		}
		// console.log("dateFilter", dateFilter)


		if (country) {
			filter["$and"].push({ "address.country": { $in: country } });
		}

		// Fetching sale
		const delivery = await ALL_MODELS.orderItems.aggregate([
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
			{ $match: dateFilter },

			{
				$lookup: {
					from: "ordershippings",
					localField: "orderId",
					foreignField: "orderId",
					as: "ordershippings",
				},
			},
			{
				$unwind: {
					path: "$ordershippings"
				}
			},
			{
				$match: {
					"ordershippings.sellerId": sellerId
				}
			},
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "ordershippings._id",
					foreignField: "orderShippingId",
					as: "orderstatusupdates",
				},
			},
			{
				$unwind: {
					path: "$orderstatusupdates"
				}
			},

			{
				$lookup: {
					from: "sellers",
					localField: "sellerId",
					foreignField: "_id",
					as: "seller",
				},
			},


			// // group
			{
				$group: {
					_id: "$orderId",
					doc: { $first: "$$ROOT" },
					totalQuantityOrdered: {
						$sum: { $toDouble: "$quantity" },
					},
					totalAmount: {
						$sum: { $toDouble: "$grandTotal" },
					},
					orderStatus: {
						$last: "$orderstatusupdates"
					},
				},
			},
			// // { $replaceRoot: { newRoot: "$doc" } },
			{ $unwind: "$doc.order" },

			{
				$project: {
					seller: 1,
					orderId: "$doc.order._id",
					createdDate: "$doc.order.createdAt",
					productVariant: "$doc.productVariantDetails",
					totalQuantityOrdered: 1,
					totalAmount: 1,
					address: "$doc.order.customerDelhiveryDetails.shippingDetails",
					sellerId: "$doc.sellerId",
					ordershippings: "$ordershippings",
					orderStatus: "$orderStatus"
				},
			},
			// Match
			{ $match: filter },
		]);
		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = []
		for (let index = 0; index < delivery.length; index++) {
			const element = delivery[index];

			let a = {
				Id: element._id,
				totalQuantityOrdered: element.totalQuantityOrdered,
				totalAmount: element.totalAmount,
				ProductVariantNameEnglish: null,
				ProductVariantNameArabic: null,
				createdDate: element.createdDate,
				Country: element.address.country,
				Status: element.orderStatus.status
			};
			for (let i = 0; i < element.productVariant.length; i++) {
				const ele = element.productVariant[i];
				// console.log("el", ele)
				if (i == 0) {
					a.ProductVariantNameEnglish = ele.productVariantName;
				}
				else if (i == 1) {
					a.ProductVariantNameArabic = ele.productVariantName;
				}
			}
			//  console.log("element", a)
			excelExportData.push(a)
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();
		let folder = `uploads/reports/seller-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);
		var down = `${folder}seller-report${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);
		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Seller  Report",
			ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
		})

		let data = await newReport.save()
		return res.send({ message: "Your XL will start downloading now.", d: data })


		//return res.send({ count: delivery.length, data: excelExportData})



	} catch (error) {
		//	console.log(error)
		return res.status(403).send({ message: error.message });
	}
}; // End of delivery_report excel

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
