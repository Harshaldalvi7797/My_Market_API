const ALL_MODELS = require("../../../../utilities/allModels");
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
let mailService = require("../../middlewares/mailService");
let mongoose = require("mongoose");
const bcrypt = require("bcrypt");
let jwt = require("jsonwebtoken");
var XLSX = require('xlsx');
const { validationResult } = require("express-validator");

function generateOTP() {
	var digits = '0123456789';
	let OTP = '';
	for (let i = 0; i < 4; i++) {
		OTP += digits[Math.floor(Math.random() * 10)];
	}
	return OTP;
}

exports.blockCustomer = async (req, res) => {
	try {
		// console.log("hi")
		if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
			return res.send({ message: "There was no customer found with given information!" })
		}
		let customer = await ALL_MODELS.customer.findByIdAndUpdate(req.body.id);
		if (!customer) {
			return res.status(403).send({ message: "No customer found by the given information!" });
		}
		customer.blockCustomer = req.body.blockCustomer
		customer.save()
		return res.send({ message: "Customer has been blocked" });
	}
	catch (error) {
		return res.status(403).send({ message: error.message }); 
	}
}

exports.customerExcelDownload = async (req, res) => {

	let { search, active } = req.body;

	let filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [
			{ "customerfullName": regexp },
			{ "emailAddress": regexp },
			{ "mobilePhone": regexp },
		];
		if (!isNaN(parseInt(search))) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	if (active) {
		filter["$and"] = [];
		filter["$and"].push({ "active": { $in: active } });
	}
	let customers = await ALL_MODELS.customer.aggregate([

		{ $sort: { "indexNo": - 1 } },
		{ $addFields: { customerfullName: { $concat: ["$firstName", " ", "$lastName"] } } },
		{ $match: filter },
		{
			$project:
			{
				password: 0,
				__v: 0
			}
		}

	])
	var wb = XLSX.utils.book_new(); //new workbook	
	let excelExportData = []

	for (let index = 0; index < customers.length; index++) {
		const element = customers[index];
		excelExportData.push({
			IndexNo: element.indexNo,
			FirstName: element.firstName,
			LastName: element.lastName,
			EmailAddressVerified: element.emailAddressVerified,
			MobilePhoneVerified: element.mobilePhoneVerified,
			Gender: element.gender,
			Guest: element.guest,
			DefaultLanguage: element.defaultLanguage,
			Active: element.active,
			EmailAddress: element.emailAddress,
			MobilePhone: element.mobilePhone,
			MobileCountryCode: element.mobileCountryCode,
			CreatedDate: element.createdAt,
			UpdatedAt: element.updatedAt,

		})

	}
	// console.log("excelExportData", excelExportData)
	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();
	let folder = `uploads/reports/admin-customer/${req.userId}/`;
	//check if folder exist or not if not then create folder user createdirectory middleware
	await createDirectories(folder);
	var down = `${folder}admin-customer${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);
	let newReport = new ALL_MODELS.reportModel({
		adminId: req.userId,
		ReportName: "CustomerExcel",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
	})

	let data = await newReport.save()
	return res.send({ message: "Your download will begin now.", data: data })
	// return res.send({ count: excelExportData.length, data: excelExportData })


}


exports.customerWithSearch = async (req, res) => {
	let { search, active } = req.body;
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
	let filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [
			{ "customerfullName": regexp },
			{ "emailAddress": regexp },
			{ "mobilePhone": regexp },
		];
		if (!isNaN(parseInt(search))) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	if (active) {
		filter["$and"] = [];
		filter["$and"].push({ "active": { $in: active } });
	}
	let customers = await ALL_MODELS.customer.aggregate([

		{ $sort: { "indexNo": - 1 } },
		{ $addFields: { customerfullName: { $concat: ["$firstName", " ", "$lastName"] } } },
		{ $match: filter },
		{
			$project:
			{
				password: 0,
				__v: 0
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

	const customerList = customers.length ? customers[0].paginatedResults : [];

	let totalCount = 0
	try {
		totalCount = customers[0].totalCount[0].count
	} catch (err) { }
	return res.send({ totalCount: totalCount, count: customerList.length, data: customerList });

}

exports.addCustomer = async (req, res) => {

	// const validationError = validationResult(req);
	// if (!validationError.isEmpty()) {
	//     return res.status(403).send({ message: validationError.array() });
	// }
	try {
		// let check = await allModels.customer.findOne({ "active": req.body.activ })
		let user = await ALL_MODELS.customer.findOne({
			"emailAddress": req.body.emailAddress
		});
		//console.log(user)
		if (user) {
			return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
		}

		let mobile = await ALL_MODELS.customer.findOne({
			"mobilePhone": req.body.mobilePhone
		});

		// console.log(mobile)
		if (mobile) {
			return res.status(409).send({ message: "Uh Oh! This Mobile Number is in use. Try logging in instead" });
		}
		let reqData = req.body;
		const newuser = new ALL_MODELS.customer({
			firstName: reqData.firstName.split(" ")[0],
			lastName: reqData.firstName.split(" ")[1],
			emailAddress: reqData.emailAddress,
			password: reqData.password,
			mobilePhone: reqData.mobilePhone,
			mobileCountryCode: reqData.mobileCountryCode,
			active: true,
			gender: reqData.gender
		});
		let salt = await bcrypt.genSalt(10);
		newuser.password = await bcrypt.hash(
			newuser.password,
			salt
		);
		let otp = generateOTP();
		newuser.otp = otp;
		newuser.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added
		let data = await newuser.save();
		//console.log(data)
		/**send email dynamically*/
		// let mailBody = {
		//     'emailId': req.body.emailAddress,
		//     'subject': 'Registration',
		//     'message': `Congratulations! Your account has been created. Your  password is ` +newuser.password + `.`
		// }
		// req.mailBody = mailBody;
		// await mailService.sendMail(req, res);
		/**send email dynamically*/
		data = await ALL_MODELS.customer.findOne({ _id: data._id })
		// .select(['emailAddress','emailAddressVerified','firstName','lastName','mobilePhone','mobileCountryCode','mobilePhoneVerified','gender']);
		return res.send({ message: "Congratulations! new customer account has been created.", d: data });
	}
	catch (error) {
		// console.log(error)
		return res.status(422).send({ error: error.message });
	}

}

exports.getCustomers = async (req, res) => {
	try {
		let customers = await ALL_MODELS.customer
			.find()
			.select(["-__v", "-updatedAt", "-password"])
			.limit(parseInt(req.query.limit))
			.skip(parseInt(req.query.skip))
			.lean();
		let totalCount = await ALL_MODELS.customer.count();
		return res.send({ count: customers.length, customers, totalCount });
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
}

exports.getCustomerById = async (req, res) => {
	try {
		let customers = await ALL_MODELS.customer.findById(req.params.id)

		return res.send({ customers });
	} catch (error) {
		return res.status(500).send(error.message)
	}
}


exports.updateCustomer = async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
			return res.send({ message: "There was no customer found with given information!" })
		}

		const customerId = req.body.id;
		let customer = await ALL_MODELS.customer.findOne({ _id: customerId });
		if (!customer) {
			return res.send({ message: "There was no customer found with given information!" })
		}

		const updateKeys = Object.keys(req.body);
		updateKeys.forEach((update) => (customer[update] = req.body[update]));
		// Send Password changed mail if password is changed
		// if (updateKeys.includes("password")) {
		// 	let salt = await bcrypt.genSalt(10);
		// 	customer.password = await bcrypt.hash(customer.password, salt);
		// 	await mailer(req, res, customer.emailAddress, req.body.password);
		// }
		await customer.save();
		return res.send({ message: "Customer has been updated.", customer });
	} catch (error) {
		return res.status(500).send(error.message)
	}
}

exports.updateStatus = async (req, res) => {

	try {
		let customer = await ALL_MODELS.customer.findByIdAndUpdate(req.body.id);
		if (!customer) {
			return res.status(403).send({ message: "invalid id" });
		}


		customer.active = req.body.active
		customer.save()
		return res.send({ message: "Customer status has been updated." });
	}
	catch (error) {
		return res.status(500).send(error.message)
	}


}

exports.deleteCustomer = async (req, res) => {
	try {
		const customerId = req.params.id;
		let customer = await ALL_MODELS.customer.findOneAndRemove({
			_id: customerId,
		});
		if (!customer)
			return res.status(404).send({
				message: "There was no customer found with given information!",
			});
		return res.send({ message: "Customer has been deleted.", customer });
	} catch (error) {
		return res.status(500).send(error.message)
	}
}

exports.mailer = async (req, res, email, password) => {
	let mailBody = {
		emailId: email,
		subject: "Password Reset Alert!",
		message: `This is your new password for your account, "${password}". Password has been reseted by Admin.`,
	};
	req.mailBody = mailBody;
	await mailService.sendMail(req, res);
}

exports.customerOrders = async (req, res) => {
	const validationError = validationResult(req)
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	let orderList = [];
	let orders = await ALL_MODELS.orderModel.find({
		customerId: req.query.customerId
	}).populate({ path: "customerId", select: ["firstName", "lastName",] })
		.select(['-__v', '-updatedAt', '-customerDelhiveryDetails'])
		.lean();

	if (orders.length > 0) {
		/* orders.forEach(async (order, i) => {
			let pvariants = await allModels.orderProduct
			  .find({ orderId: order._id }).select(['-orderId', '-__v', '-_id', '-createdAt', '-updatedAt'])
			order['productVariants'] = pvariants;
			orderList.push(order);
			if ((orders.length - 1) == i) {
			  return res.send({ count: orderList.length, orders: orderList })
			}
		}) */
		let asyncOrderForEach = async (orders, orderList) => {
			return new Promise((resolve, reject) => {
				orders.forEach(async (order, i) => {
					let pvariants = await ALL_MODELS.orderProduct
						.find({ orderId: order._id }).select(['-orderId', '-__v', '-_id', '-createdAt', '-updatedAt'])
					order['productVariants'] = pvariants;
					orderList.push(order);
					if (i == (orders.length - 1)) {
						resolve(true);
						//console.log(JSON.stringify(orderList));
					}
				})
			});
		}
		await asyncOrderForEach(orders, orderList);
		return res.send({ count: orderList.length, orders: orderList })

	} else {
		return res.send({ count: orders.length, orders: [] })
	}

}


