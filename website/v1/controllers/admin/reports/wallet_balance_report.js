// Third party modules
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");

const wallet_balance_report = async (req, res, next) => {
	let { limit, page, search, wallet_balance_start, wallet_balance_end, } = req.body;

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
		let Searchfilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "customer": regexp },
				{ "phone": regexp },
				{ "email": regexp },
			];
		}

		/**
		 * Filtering
		*/
		let pricingFilters = { $and: [] };
		if (wallet_balance_start) {
			pricingFilters["$and"].push({ balance: { $gte: wallet_balance_start } });
		} else {
			pricingFilters["$and"].push({ balance: { $gte: 0 } });
		}
		if (wallet_balance_end) {
			pricingFilters["$and"].push({ balance: { $lte: wallet_balance_end } });
		}

		// Fetching sale
		const wallet_balance = await ALL_MODELS.walletModel.aggregate([
			// Lookup
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
				$project: {
					customer: { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
					email: "$customer.emailAddress",
					phone: "$customer.mobilePhone",
					balance: {
						$toDouble: "$currentBalance"
					},
				}
			},
			{ $match: pricingFilters },
			{ $match: Searchfilter },
			{ $sort: { balance: -1 } },
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
			totalCount = wallet_balance[0].totalCount[0].count;
		} catch (err) { }

		return res.json({
			totalCount: totalCount,
			data: wallet_balance.length ? wallet_balance[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

const wallet_balance_report_excel = async (req, res, next) => {
	let { search, wallet_balance_start, wallet_balance_end, } = req.body;

	try {
		// Filter
		let Searchfilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");
			Searchfilter["$or"] = [
				{ "customer": regexp },
				{ "phone": regexp },
				{ "email": regexp },
			];
		}

		/**
		 * Filtering
		*/
		let pricingFilters = { $and: [] };
		if (wallet_balance_start) {
			pricingFilters["$and"].push({ balance: { $gte: wallet_balance_start } });
		} else {
			pricingFilters["$and"].push({ balance: { $gte: 0 } });
		}
		if (wallet_balance_end) {
			pricingFilters["$and"].push({ balance: { $lte: wallet_balance_end } });
		}

		// Fetching sale
		const wallet_balance = await ALL_MODELS.walletModel.aggregate([
			// Lookup
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
				$project: {
					customer: { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
					email: "$customer.emailAddress",
					phone: "$customer.mobilePhone",
					balance: {
						$toDouble: "$currentBalance"
					},
				}
			},
			{ $match: pricingFilters },
			{ $match: Searchfilter },
			{ $sort: { balance: -1 } },
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < wallet_balance.length; index++) {
			const element = wallet_balance[index];

			excelExportData.push({
				Customer: element.customer,
				Email: element.email,
				Phone: element.phone,
				Balance: element.balance,
			});
		}

		var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}wallet_balance_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Wallet Balance Report",
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

module.exports = { wallet_balance_report, wallet_balance_report_excel };
