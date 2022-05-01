const ALL_MODELS = require("../../../../utilities/allModels");
const mongoose = require("mongoose");
var XLSX = require("xlsx");
const ObjectId = mongoose.Types.ObjectId;
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
exports.suggestionWithSearch = async (req, res) => {

	let { limit, page, search } = req.body;

	if (!limit) { limit = 10 }
	if (!page) { page = 1 }

	let perPage = parseInt(limit)
	let pageNo = Math.max(0, parseInt(page))

	if (pageNo > 0) {
		pageNo = pageNo - 1;
	} else if (pageNo < 0) {
		pageNo = 0;
	}


	const filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [
			{ "name": regexp },
			{ "emailAddress": regexp },
			{ "mobileNumber": regexp },
			{ "idea": regexp }
		];

		if (!isNaN(parseInt(search)) && search.toString().length < 6) {
			if (!filter["$or"]) { filter["$or"] = [] }
			filter["$or"].push({ indexNo: parseInt(search) });
		}

	}
	// console.log(filter);
	let suggestIdeas = await ALL_MODELS.suggets.aggregate([
		{ $sort: { createdAt: -1 } },
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
	])
	const suggestList = suggestIdeas.length ? suggestIdeas[0].paginatedResults : [];

	let totalCount = 0;
	try {
		totalCount = suggestIdeas[0].totalCount[0].count
	} catch (error) {
		totalCount = 0
	}

	return res.json({ totalCount: totalCount, count: suggestList.length, data: suggestList });

	// return res.send({ d: suggestIdeas })
}

exports.suggestionWithSearchExcel = async (req, res) => {

	let { search } = req.body;

	const filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [
			{ "name": regexp },
			{ "emailAddress": regexp },
			{ "mobileNumber": regexp },
			{ "idea": regexp }
		];

		if (!isNaN(parseInt(search)) && search.toString().length < 6) {
			if (!filter["$or"]) { filter["$or"] = [] }
			filter["$or"].push({ indexNo: parseInt(search) });
		}

	}
	// console.log(filter);
	let suggestIdeas = await ALL_MODELS.suggets.aggregate([
		{ $sort: { createdAt: -1 } },
		{ $match: filter },
	])

	var wb = XLSX.utils.book_new(); //new workbook
	let excelExportData = [];

	for (let index = 0; index < suggestIdeas.length; index++) {
		const element = suggestIdeas[index];
		excelExportData.push({
			'Suggestion#': element.indexNo,
			Name: element.name,
			EmailId: element.emailAddress,
			CountryCode: element.countryCode,
			MobileNumber: element.mobileNumber,
			Idea: element.idea,
		});
	}

	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();

	let folder = `uploads/reports/admin-suggestion/${req.userId}/`;
	//check if folder exist or not if not then create folder user createdirectory middleware
	await createDirectories(folder);

	var down = `${folder}suggestion_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);

	let newReport = new ALL_MODELS.reportModel({
		sellerId: req.userId,
		ReportName: "Suggestion Excel",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
	});

	let data = await newReport.save();

	return res.send({
		message: "Your XL will start downloading now.",
		d: data,
	});

	// return res.send({ d: suggestIdeas })
}

exports.suggestIdeas = async (req, res) => {
	try {
		let suggestIdeas = await ALL_MODELS.suggets
			.find()
			// .select(["-__v", "-updatedAt", "-password"])
			.limit(parseInt(req.query.limit))
			.skip(parseInt(req.query.skip))
			.lean();
		let totalCount = await ALL_MODELS.suggets.count();
		res.send({ count: suggestIdeas.length, totalCount, suggestIdeas });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
}

exports.singleIdea = async (req, res) => {
	try {
		let idea = await ALL_MODELS.suggets.findById(req.params.id)
		// .select(["-__v", "-updatedAt", "-password"])
		// .limit(parseInt(req.query.limit))
		// .skip(parseInt(req.query.skip))
		// .lean();
		// let totalCount = await ALL_MODELS.customer.count();
		res.send({ idea });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
}
