// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const inactive_customer_report = async (req, res) => {
	let { start_date, end_date,daysInactive_start, daysInactive_end, limit, page, search } = req.body;

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
		let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			searchFilter["$or"] = [
				{ "mobilePhone": regexp },
				{ "firstName": regexp },
				{ "lastName": regexp },
				{ "emailAddress": regexp },
			];
		}
		// Filter
        const filter = {};
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);
 
        if(end_date)
            filter.lastLoginDate = { $lte: new Date(end_date) }

		if(daysInactive_start)
            filter.daysInactive = { $lte: daysInactive_start }
		if(daysInactive_end)
            filter.daysInactive = { $lte: daysInactive_end }
		
		// Fetching sale
		const customer = await ALL_MODELS.customer.aggregate([
			// lookup
			{ $match: { $or:[
				{ active: false },
				{ lastLoginDate : {$gte: start_date ?? defaultDate}}
			]}},
			// Match
            { $match: searchFilter },
			{
				$project: {
					firstName: 1,
					lastName: 1,
					mobilePhone: 1,
					emailAddress: 1,
					lastLoginDate: 1,
					deactivated: "$active",
					daysInactive: {
						$trunc: {
							$divide: [{ $subtract: [new Date(), "$lastLoginDate"] }, 1000 * 60 * 60 * 24],
						},
					},
				},
			},
			{ $match: filter },
			{ $sort: {daysInactive: -1}},
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
			totalCount = customer[0].totalCount[0].count;
		} catch (err) {}

		return res.json({
			totalCount: totalCount,
			data: customer.length ? customer[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

const inactive_customer_report_excel = async (req, res) => {
	let { start_date, end_date, search, daysInactive_start, daysInactive_end } = req.body;

	try {
		let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");
			searchFilter["$or"] = [
				{ "mobilePhone": regexp },
				{ "firstName": regexp },
				{ "lastName": regexp },
				{ "emailAddress": regexp },
			];
		}
		// Filter
        const filter = {};
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);
 
        if(end_date)
            filter.lastLoginDate = { $lte: new Date(end_date) }
		
		if(daysInactive_start)
            filter.daysInactive = { $lte: daysInactive_start }
		if(daysInactive_end)
            filter.daysInactive = { $lte: daysInactive_end }
		// Fetching sale
		const customer = await ALL_MODELS.customer.aggregate([
			// lookup
			{ $match: { $or:[
				{ active: false },
				{ lastLoginDate : {$gte: start_date ?? defaultDate}}
			]}},
			// Match
            { $match: searchFilter },
			{
				$project: {
					firstName: 1,
					lastName: 1,
					mobilePhone: 1,
					emailAddress: 1,
					lastLoginDate: 1,
					deactivated: "$active",
					daysInactive: {
						$trunc: {
							$divide: [{ $subtract: [new Date(), "$lastLoginDate"] }, 1000 * 60 * 60 * 24],
						},
					},
				},
			},
			{ $match: filter },
			{ $sort: {daysInactive: -1}},
		]);

		var wb = XLSX.utils.book_new(); //new workbook
		let excelExportData = [];

		for (let index = 0; index < customer.length; index++) {
			const element = customer[index];

			excelExportData.push({
				firstName: element.firstName,
				lastName: element.lastName,
				mobilePhone: element.mobilePhone,
				emailAddress: element.emailAddress,
				lastLoginDate: element.lastLoginDate,
				deactivated: element.deactivated,
				daysInactive: element.daysInactive,
			});
		}

        var temp = JSON.stringify(excelExportData);
		temp = JSON.parse(temp);
		var ws = XLSX.utils.json_to_sheet(temp);
		let today = new Date();

		let folder = `uploads/reports/admin-report/${req.userId}/`;
		//check if folder exist or not if not then create folder user createdirectory middleware
		await createDirectories(folder);

		var down = `${folder}inactive_customer_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
		XLSX.utils.book_append_sheet(wb, ws, "sheet1");
		XLSX.writeFile(wb, down);

		let newReport = new ALL_MODELS.reportModel({
			sellerId: req.userId,
			ReportName: "Inactive Customer Report",
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

module.exports = {inactive_customer_report, inactive_customer_report_excel};
