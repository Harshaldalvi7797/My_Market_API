// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

Date.prototype.monthDays = function () {
	var d = new Date(this.getFullYear(), this.getMonth() + 1, 0);
	return d.getDate();
}

const lastDateOfMonth = (y, m) => {
	return new Date(y, m + 1, 0).getDate();
}

const mmWalletReport = async (req, res, next) => {
	let { limit, page, month, year, search,
		totalDebitAmount_start, totalDebitAmount_end,
		totalCreditAmount_start, totalCreditAmount_end,
		currentBalance_start, currentBalance_end
	} = req.body;

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
		let filter = {};
		if (totalCreditAmount_start || totalCreditAmount_end || totalDebitAmount_start || totalDebitAmount_end || currentBalance_start || currentBalance_end) {
			filter['$and'] = []
		}
		if (totalCreditAmount_start) {
			filter["$and"].push({ totalCreditAmount: { $gte: totalCreditAmount_start } });
		}

		if (totalCreditAmount_end) {
			filter["$and"].push({ totalCreditAmount: { $lte: totalCreditAmount_end } });
		}

		if (totalDebitAmount_start) {
			filter["$and"].push({ totalDebitAmount: { $gte: totalDebitAmount_start } });
		}
		if (totalDebitAmount_end) {
			filter["$and"].push({ totalDebitAmount: { $lte: totalDebitAmount_end } });
		}

		if (currentBalance_start) {
			filter["$and"].push({ currentBalance: { $gte: currentBalance_start } });
		}
		if (currentBalance_end) {
			filter["$and"].push({ currentBalance: { $lte: currentBalance_end } });
		}

		let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "customer.fullName": regexp },
				{ "customer.emailAddress": regexp },
				{ "customer.mobileNumber": regexp }
			];
			if (parseFloat(search) != NaN) {
				searchFilter["$or"].push({ "totalCreditAmount": parseFloat(search) });
				searchFilter["$or"].push({ "totalDebitAmount": parseFloat(search) });
				searchFilter["$or"].push({ "currentBalance": parseFloat(search) });
				searchFilter["$or"].push({ "customer.indexNo": parseInt(search) });
			}
		}

		let currentDate = new Date();
		let endDate = new Date();
		let startDate = new Date();

		if (month != undefined) {
			endDate.setMonth(parseInt(month.toString()));
			startDate.setMonth(parseInt(month.toString()));
		}
		if (year != undefined) {
			endDate.setFullYear(year);
			startDate.setFullYear(year);
		}

		startDate.setDate(1);
		startDate.setHours(0);
		startDate.setMinutes(0);

		if (currentDate.getMonth() == endDate.getMonth()) {
			endDate.setHours(0);
			endDate.setMinutes(0);
		} else {
			let lastDate = lastDateOfMonth(endDate.getFullYear(), endDate.getMonth());
			endDate.setDate(lastDate);
			endDate.setHours(0);
			endDate.setMinutes(0);
		}

		// Fetching sale
		const offer = await ALL_MODELS.walletModel.aggregate([
			{
				$match: {
					// "fundBy.userType": "Customer",
					createdAt: {
						$gte: startDate,
						$lte: endDate
					},
				},
			},
			{
				$group: {
					_id: "$customerId",
					totalCreditAmount: {
						$sum: {
							$toDouble: {
								$cond: {
									if: { $eq: [null, "$creditAmount"] },
									then: 0,
									else: "$creditAmount",
								}
							}
						}
					},
					totalDebitAmount: {
						$sum: {
							$toDouble: {
								$cond: {
									if: { $eq: [null, "$debitAmount"] },
									then: 0,
									else: "$debitAmount",
								}
							}
						}
					},
					customerId: { $first: "$customerId" },
					currentBalance: { $last: { $toDouble: "$currentBalance" } }
				}
			},
			{
				$lookup: {
					from: "customers",
					localField: "customerId",
					foreignField: "_id",
					as: "customer",
				},
			},
			{ $unwind: "$customer" },
			{
				$project:
				{
					"customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
					"customer.emailAddress": 1,
					"customer.mobileNumber": 1,
					"customer._id": 1,
					"customer.indexNo": 1,
					"totalCreditAmount": 1,
					"totalDebitAmount": 1,
					"currentBalance": 1
				}
			},
			{ $match: searchFilter },
			{ $match: filter },
			{ $sort: { "customer.indexNo": -1 } },
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
			totalCount = offer[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: offer.length ? offer[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

const mmWalletReport_excel = async (req, res, next) => {
	let { month, year, search,
		totalDebitAmount_start, totalDebitAmount_end,
		totalCreditAmount_start, totalCreditAmount_end,
		currentBalance_start, currentBalance_end
	} = req.body;

	try {
		// Filter
		let filter = {};
		if (totalCreditAmount_start || totalCreditAmount_end || totalDebitAmount_start || totalDebitAmount_end || currentBalance_start || currentBalance_end) {
			filter['$and'] = []
		}
		if (totalCreditAmount_start) {
			filter["$and"].push({ totalCreditAmount: { $gte: totalCreditAmount_start } });
		}

		if (totalCreditAmount_end) {
			filter["$and"].push({ totalCreditAmount: { $lte: totalCreditAmount_end } });
		}

		if (totalDebitAmount_start) {
			filter["$and"].push({ totalDebitAmount: { $gte: totalDebitAmount_start } });
		}
		if (totalDebitAmount_end) {
			filter["$and"].push({ totalDebitAmount: { $lte: totalDebitAmount_end } });
		}

		if (currentBalance_start) {
			filter["$and"].push({ currentBalance: { $gte: currentBalance_start } });
		}
		if (currentBalance_end) {
			filter["$and"].push({ currentBalance: { $lte: currentBalance_end } });
		}

		let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "customer.fullName": regexp },
				{ "customer.emailAddress": regexp },
				{ "customer.mobileNumber": regexp }
			];
			if (parseFloat(search) != NaN) {
				searchFilter["$or"].push({ "totalCreditAmount": parseFloat(search) });
				searchFilter["$or"].push({ "totalDebitAmount": parseFloat(search) });
				searchFilter["$or"].push({ "currentBalance": parseFloat(search) });
				searchFilter["$or"].push({ "customer.indexNo": parseInt(search) });
			}
		}

		let currentDate = new Date();
		let endDate = new Date();
		let startDate = new Date();

		if (month != undefined) {
			endDate.setMonth(parseInt(month.toString()));
			startDate.setMonth(parseInt(month.toString()));
		}
		if (year != undefined) {
			endDate.setFullYear(year);
			startDate.setFullYear(year);
		}

		startDate.setDate(1);
		startDate.setHours(0);
		startDate.setMinutes(0);

		if (currentDate.getMonth() == endDate.getMonth()) {
			endDate.setHours(0);
			endDate.setMinutes(0);
		} else {
			let lastDate = lastDateOfMonth(endDate.getFullYear(), endDate.getMonth());
			endDate.setDate(lastDate);
			endDate.setHours(0);
			endDate.setMinutes(0);
		}

		// Fetching sale
		const offer = await ALL_MODELS.walletModel.aggregate([
			{
				$match: {
					// "fundBy.userType": "Customer",
					createdAt: {
						$gte: startDate,
						$lte: endDate
					},
				},
			},
			{
				$group: {
					_id: "$customerId",
					totalCreditAmount: {
						$sum: {
							$toDouble: {
								$cond: {
									if: { $eq: [null, "$creditAmount"] },
									then: 0,
									else: "$creditAmount",
								}
							}
						}
					},
					totalDebitAmount: {
						$sum: {
							$toDouble: {
								$cond: {
									if: { $eq: [null, "$debitAmount"] },
									then: 0,
									else: "$debitAmount",
								}
							}
						}
					},
					customerId: { $first: "$customerId" },
					currentBalance: { $last: { $toDouble: "$currentBalance" } }
				}
			},
			{
				$lookup: {
					from: "customers",
					localField: "customerId",
					foreignField: "_id",
					as: "customer",
				},
			},
			{ $unwind: "$customer" },
			{
				$project:
				{
					"customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
					"customer.emailAddress": 1,
					"customer.mobileNumber": 1,
					"customer._id": 1,
					"customer.indexNo": 1,
					"totalCreditAmount": 1,
					"totalDebitAmount": 1,
					"currentBalance": 1
				}
			},
			{ $match: searchFilter },
			{ $match: filter },
			{ $sort: { "customer.indexNo": -1 } },
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < offer.length; index++) {
			const element = offer[index];

			excelExportData.push({
				"Customer#": element.customer.indexNo,
				CustomerName: `${element.customer.fullName}`,
				TotalCreditAmount: element.totalCreditAmount,
				TotalDebitAmount: element.totalDebitAmount,
				CurrentBalance: element.currentBalance
			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}mymarketwalletdetails_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "My Market Wallet Details",
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

module.exports = { mmWalletReport, mmWalletReport_excel };
