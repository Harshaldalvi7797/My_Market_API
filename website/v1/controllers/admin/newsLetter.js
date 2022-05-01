const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");
let upload = require("./../../middlewares/fileUpload");
var XLSX = require('xlsx');
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
exports.adminNewsLetterExcel = async (req, res) => {
	const { search } = req.body;
	const filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [

			{ "customers.firstName": regexp },
			{ "customers.lastName": regexp },
			{ "emailAddress": regexp }
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	let newsLetter = await ALL_MODELS.customerNewsLetter.aggregate([
		{
			$lookup: {
				from: "customers",
				localField: "customerId",
				foreignField: "_id",
				as: "customers"
			}
		},
		{ $unwind: "$customers" },
		{ $match: filter },
		{
			$project:
			{
				_id: 1,
				indexNo: 1,
				customerId: 1,
				emailAddress: 1,
				emailActive: 1,
				acceptTerms: 1,
				customerNewsLetterId: 1,
				createdAt: 1,
				updatedAt: 1,
				"customers.firstName": 1,
				"customers.lastName": 1
			}
		},
		{ $sort: { "indexNo": -1 } },
	])


	var wb = XLSX.utils.book_new(); //new workbook
	let excelExportData = []

	for (let index = 0; index < newsLetter.length; index++) {
		const element = newsLetter[index];
		let a = {
			Id: element._id,
			IndexNo: element.indexNo,
			FirstName: element.customers.firstName,
			LastName: element.customers.lastName,
			Email: element.customers.emailAddress,
			EmailActive: element.emailActive
		};
		excelExportData.push(a)
	}
	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();
	let folder = `uploads/reports/admin-newsletter/${req.userId}/`;
	//check if folder exist or not if not then create folder user createdirectory middleware
	await createDirectories(folder);
	var down = `${folder}admin-newsletter${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);
	let newReport = new ALL_MODELS.reportModel({
		sellerId: req.userId,
		ReportName: "Admin Newsletter Report",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
	})

	let data = await newReport.save()
	return res.send({ message: "Your download will begin now.", d: data })








//	return res.send({ count: newsLetter.length, data: newsLetter })


}

exports.getAllNewsLetter = async (req, res) => {
	const { search } = req.body;
	let { limit, page } = req.body;

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

			{ "customers.firstName": regexp },
			{ "customers.lastName": regexp },
			{ "emailAddress": regexp }
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	let newsLetter = await ALL_MODELS.customerNewsLetter.aggregate([
		{
			$lookup: {
				from: "customers",
				localField: "customerId",
				foreignField: "_id",
				as: "customers"
			}
		},
		{ $match: filter },
		{
			$project:
			{
				_id: 1,
				indexNo: 1,
				customerId: 1,
				emailAddress: 1,
				emailActive: 1,
				acceptTerms: 1,
				customerNewsLetterId: 1,
				createdAt: 1,
				updatedAt: 1,
				"customers.firstName": 1,
				"customers.lastName": 1
			}
		},
		{ $sort: { "indexNo": -1 } },
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

	const newsLetterList = newsLetter.length ? newsLetter[0].paginatedResults : [];

	let totalCount = 0
	try {
		totalCount = newsLetter[0].totalCount[0].count
	} catch (err) { }
	return res.send({ totalCount: totalCount, count: newsLetterList.length, data: newsLetterList });


}

exports.deleteNewsLetter = async (req, res, next) => {
	try {
		const { _id } = req.params;

		const { n: isDeleted } = await ALL_MODELS.customerNewsLetter.deleteOne({ _id });

		return res.status(isDeleted ? 200 : 404).json({
			message: isDeleted ? "customer NewsLetter has been removed successfully" : "Resource not found."
		});

	} catch (error) { return res.status(403).send({ message: error.message }); }
}