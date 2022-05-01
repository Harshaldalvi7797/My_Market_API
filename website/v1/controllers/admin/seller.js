const ALL_MODELS = require("../../../../utilities/allModels");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
let mailService = require("../../middlewares/mailService");
const bcrypt = require("bcrypt");
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
let upload = require("./../../middlewares/fileUpload");
var XLSX = require('xlsx');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.sellerExcelDownload = async (req, res) => {

	let { search, adminVerified, country } = req.body;

	const filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [
			{ "sellerfullName": regexp },
			{ "nameOfBussinessEnglish": regexp },
			{ "emailAddress": regexp },
			{ "mobilePhone": regexp },
			{ "sellerCountry": regexp },
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}
	if (adminVerified || country) {
		filter["$and"] = [];
	}
	if (adminVerified) {
		filter["$and"].push({ "adminVerified": { $in: adminVerified } });
	}
	if (country) {
		filter["$and"].push({ "sellerCountry": { $in: country } });
	}

	let sellers = await ALL_MODELS.seller.aggregate([
		{ $sort: { "indexNo": - 1 } },
		{ $addFields: { sellerfullName: { $concat: ["$sellerDetails.sellerfName", " ", "$sellerDetails.sellerlName"] } } },
		{ $match: filter },
		{
			$project: {
				otp: 0,
				password: 0,
				expireOtp: 0
			}
		}
	])


	var wb = XLSX.utils.book_new(); //new workbook
	let excelExportData = []

	for (let index = 0; index < sellers.length; index++) {
		const element = sellers[index];
		let a = {
			Id: element._id,
			IndexNo: element.indexNo,
			EmailAddressVerified: element.emailAddressVerified,
			AdminVerified: element.adminVerified,
			SellerCountry: element.sellerCountry,
			VatNo: element.vatNo,
			SupplierFrom: element.supplierFrom,
			nameOfBussinessEnglish: element.nameOfBussinessEnglish,
			EmailAddress: element.emailAddress,
			MobilePhone: element.mobilePhone,
			DeliveryMethod: element.deliveryMethod
		};

		excelExportData.push(a)

	}
	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();
	let folder = `uploads/reports/admin-seller/${req.userId}/`;
	//check if folder exist or not if not then create folder user createdirectory middleware
	await createDirectories(folder);
	var down = `${folder}admin-seller${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);
	let newReport = new ALL_MODELS.reportModel({
		sellerId: req.userId,
		ReportName: "admin seller Report",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
	})

	let data = await newReport.save()
	return res.send({ message: "Your download will begin now.", d: data })


}

exports.getSellerWithSearch = async (req, res) => {
	let { search, adminVerified, country } = req.body;
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
			{ "sellerfullName": regexp },
			{ "nameOfBussinessEnglish": regexp },
			{ "emailAddress": regexp },
			{ "mobilePhone": regexp },
			{ "sellerCountry": regexp },
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}
	if (adminVerified || country) {
		filter["$and"] = [];
	}
	if (adminVerified) {
		filter["$and"].push({ "adminVerified": { $in: adminVerified } });
	}
	if (country) {
		filter["$and"].push({ "sellerCountry": { $in: country } });
	}
	try {
		let sellers = await ALL_MODELS.seller.aggregate([
			{ $sort: { "indexNo": - 1 } },
			{ $addFields: { sellerfullName: { $concat: ["$sellerDetails.sellerfName", " ", "$sellerDetails.sellerlName"] } } },
			{ $match: filter },
			{
				$project: {
					otp: 0,
					password: 0,
					expireOtp: 0
				}
			},
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

		const sellerList = sellers.length ? sellers[0].paginatedResults : [];

		let totalCount = 0
		try {
			totalCount = sellers[0].totalCount[0].count
		} catch (err) { }
		return res.send({ totalCount: totalCount, count: sellerList.length, data: sellerList });

	} catch (error) {

	}
};

exports.adminApprovalUpdate = async (req, res) => {
	try {

		if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
			return res.send({ message: "There was no seller found with given information!" })
		}

		let seller = await ALL_MODELS.seller.findByIdAndUpdate(req.body.id);
		if (!seller) {
			return res.status(403).send({ message: "There was no seller found with given information!" });
		}
		seller.adminVerified = req.body.adminVerified
		seller.save()

		//Notification Work
		seller.sellername = seller.nameOfBussinessEnglish
		seller.emailId = seller.emailAddress
		if (req.body.adminVerified == true) {
			sendNotification(req, req.userId, seller._id, '56', seller, 'seller', seller._id)
		}
		else {
			sendNotification(req, req.userId, seller._id, '55', seller, 'seller', seller._id)
		}
		//End Notification Work

		return res.send({ message: "Seller has been approved" });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}

}

exports.getSellerById = async (req, res) => {
	try {
		let seller = await ALL_MODELS.seller.findById(req.params.id)
		res.send({ seller });
	} catch (error) {
		res.status(500).send(
			error.message
		);
	}
};

exports.updateSeller = async (req, res) => {
	try {
		const sellerId = req.params.id;
		let seller = await ALL_MODELS.seller.findOne({ _id: sellerId });
		if (!seller) {
			return res.status(404).send({ message: "No seller found by the given information!" });
		}

		const updateKeys = Object.keys(req.body);
		updateKeys.forEach((update) => (seller[update] = req.body[update]));
		// Send Password changed mail if password is changed
		if (updateKeys.includes("password")) {
			let salt = await bcrypt.genSalt(10);
			seller.password = await bcrypt.hash(seller.password, salt);
			await mailer(req, res, seller.emailAddress, req.body.password);
		}
		await seller.save();
		res.send({ message: "Seller has been updated.", seller });
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

exports.deleteSeller = async (req, res) => {
	try {
		const sellerId = req.params.id;
		let seller = await ALL_MODELS.seller.findOneAndRemove({ "emailAddress": req.body.emailAddress });
		if (!seller)
			return res
				.status(404)
				.send({ message: "There was no seller found with given information!" });
		res.send({ message: "Seller has been deleted.", seller });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

exports.searchSeller = async (req, res) => {
	try {
		const sellerName = req.query.bname;
		let seller = await ALL_MODELS.seller
			.find({ nameOfBussinessEnglish: { $regex: sellerName, $options: "i" } })
			.limit(parseInt(req.query.limit));
		const totalCount = await ALL_MODELS.seller
			.find({ nameOfBussinessEnglish: { $regex: sellerName, $options: "i" } })
			.countDocuments();
		if (!seller)
			return res.status(404).send({
				message: "There was no seller's found with given information!",
			});
		res.send({ seller, totalCount, sellerCount: seller.length });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

exports.sellerEarnings = async (req, res) => {
	try {
		const sellerId = req.params.id;
		//console.log(sellerId);
		let seller = await ALL_MODELS.productVariant.aggregate([
			{
				$match: {
					sellerId: ObjectId(sellerId),
				},
			},
		]);
		let totalEarnings = 0;
		seller.forEach((s) => (totalEarnings += parseFloat(s.productGrossPrice)));
		res.send({ products: seller, totalEarnings });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

exports.getDetails = async (req, res) => {
	try {
		const sellerId = req.params.id;
		let seller = await ALL_MODELS.seller.findOneAndRemove({ _id: sellerId });
		if (!seller)
			return res
				.status(404)
				.send({ message: "There was no seller found with given information!" });
		res.send(seller);
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

exports.mailer = async (req, res, email, password) => {
	let mailBody = {
		emailId: email,
		subject: "Password Reset Alert!",
		message: `This is your new password for seller account, "${password}". Password has been reseted by Admin.`,
	};
	req.mailBody = mailBody;
	await mailService.sendMail(req, res);
};

// module.exports = {
// 	getSellers,
// 	updateSeller,
// 	deleteSeller,
// 	searchSeller,
// 	sellerEarnings,
// 	getSellerById
// };
