const ALL_MODELS = require("../../../../utilities/allModels");
const { validationResult } = require('express-validator');
let mongoose = require("mongoose");
var XLSX = require('xlsx');
const request = require('request-promise');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.ordersWithSearch = async (req, res) => {
	let { search, paymentMethod, status, sellerCountry, customerCountry } = req.body;
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
	let filterSearch = {};
	let filter = {};

	if (paymentMethod) {
		try {
			filter["$and"] = [{ paymentMethod: { $in: paymentMethod } }]
		} catch (error) {
			// console.log(error.message);
		}
	}

	if (status) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ orderStatus: { $in: status } }]
			} else {
				filter["$and"].push({ orderStatus: { $in: status } });
			}
		} catch (error) {
			// console.log(error.message);
		}
	}

	if (sellerCountry) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "seller.sellerFilterCountry": { $in: sellerCountry } }]
			} else {
				filter["$and"].push({ "seller.sellerFilterCountry": { $in: sellerCountry } });
			}
		} catch (error) {
			// console.log(error.message);
		}
	}

	if (customerCountry) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } }]
			} else {
				filter["$and"].push({ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } });
			}
		} catch (error) {
			// console.log(error.message);
		}
	}

	if (search) {
		if (isNaN(parseInt(search))) {
			//console.log(search.split(" "))
			const regexp = new RegExp(search, "i");
			filterSearch["$or"] = [
				{ "paymentMethod": regexp },
				{ "customer.fullName": regexp },
				{ "customerDelhiveryDetails.shippingDetails.country": regexp },
				{ "seller.nameOfBussinessEnglishEnglish": regexp },
				{ "seller.sellerCountry": regexp },
				{ "order_shipping_id": regexp }
			];
		}
		if (!isNaN(parseInt(search))) {
			if (!filterSearch["$or"]) { filterSearch["$or"] = [] }

			let totalPrice = { $gt: parseFloat(search) - 1, $lt: parseFloat(search) + 1 };
			// console.log(totalPrice);
			filterSearch["$or"].push({ "indexNo": parseInt(search) });
			filterSearch["$or"].push({
				"totalPrice": totalPrice
			});
		}

	}

	try {
		let orderItemFilter = {
			$expr: {
				$and: [
					{ $eq: ["$orderId", "$$orderId"] },
					{ $eq: ["$sellerId", "$$sellerId"] }
				]
			}
		}

		const orderShipping = await ALL_MODELS.orderModel.aggregate([

			{
				$lookup: {
					from: "ordershippings",
					localField: "_id",
					foreignField: "orderId",
					as: "orderShippings",
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
			{ $unwind: "$orderShippings" },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "orderShippings._id",
					foreignField: "orderShippingId",
					as: "orderStatusUpdate",
				}
			},
			{
				$lookup: {
					from: "sellers",
					localField: "orderShippings.sellerId",
					foreignField: "_id",
					as: "sellers",
				},
			},
			{ $addFields: { orderStatus: { $last: "$orderStatusUpdate.status" } } },
			{
				$lookup: {
					from: "orderitems",
					let: {
						orderId: "$orderShippings.orderId",
						sellerId: "$orderShippings.sellerId",
					},
					pipeline: [{
						$match: orderItemFilter
					}],
					as: "orderItems",
				},
			},
			{
				$addFields: {
					isCancelReturnRefund: {
						$filter: {
							input: "$orderItems",
							as: "item",
							cond: {
								$cond: {
									if: {
										$or: [
											{ $eq: ["$$item.Cancelled", true] },
											{ $eq: ["$$item.Returned", true] },
											{ $eq: ["$$item.Refunded", true] }
										]
									}, then: true, else: false
								}
							}
						},
					},
				}
			},
			{
				$addFields: {
					isCancelReturnRefund: {
						$cond: {
							if: { $eq: ["$isCancelReturnRefund", []] },
							then: false, else: true
						}
					}
				}
			},
			{
				$lookup: {
					from: "productvariants",
					localField: "orderItems.productVariantId",
					foreignField: "_id",
					as: "productvariants",
				},
			},
			{ $unwind: "$productvariants" },
			{ $addFields: { "orderItems.productvariantIndexNo": "$productvariants.indexNo" } },


			{ $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
			{
				$project: {
					customer: 1,
					customerDelhiveryDetails: 1,
					orderShippings: 1,
					seller: {
						nameOfBussinessEnglish: { $first: "$sellers.nameOfBussinessEnglish" },
						sellerCountry: { $replaceAll: { input: { $first: "$sellers.sellerCountry" }, find: "_", replacement: " " } },
						sellerFilterCountry: { $first: "$sellers.sellerCountry" }
					},
					subscriptionId: 1,
					paymentMethod: 1,
					orderItems: 1,
					totalPrice: { $sum: "$orderItems.grandTotal" },
					indexNo: 1,
					order_shipping_id: { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
					orderStatus: 1,
					isCancelReturnRefund: 1


				}
			},

			{
				$project: {
					"customer.tapCustomerId": 0,
					"customer.__v": 0,
					"customer.password": 0,
					"customer.expireOtp": 0,
					"customer.otp": 0,
					"customer.resetpasswordtoken": 0,
					"customer.emailAddressVerified": 0,
					"customer.mobilePhoneVerified": 0,
					"customer.googleLoginId": 0,
					"customer.referralCode": 0,
				}
			},
			{ $match: filterSearch },
			{ $match: filter },
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

		const orderShippingList = orderShipping.length ? orderShipping[0].paginatedResults : [];
		let totalCount = 0
		try {
			totalCount = orderShipping[0].totalCount[0].count
		} catch (err) { }

		return res.send({ totalCount: totalCount, count: orderShippingList.length, data: orderShippingList })

	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
}

exports.adminOrderStatusList = async (req, res) => {
	if (!req.query.shippingHash) {
		return res.status(403).send({ message: "Please enter shipping hash" });
	}

	let filter = {
		$and: [
			{ "orderId": mongoose.Types.ObjectId(req.query.orderId) },
			{ "indexNo": parseInt(req.query.shippingHash) },
		]
	}
	// console.log(filter);

	const orders = await ALL_MODELS.orderShippingNew.aggregate([
		{ $match: filter },
		{
			$lookup: {
				from: "orderstatusupdates",
				localField: "_id",
				foreignField: "orderShippingId",
				as: "orderstatus",
			},
		},
		{
			$project: {
				orderId: 0,
				sellerId: 0,
				createdDate: 0,
				updatedDate: 0,
				__v: 0,
				"orderstatus.__v": 0,
				"orderstatus.createdDate": 0,
				"orderstatus.updatedDate": 0,
				"orderstatus.statusUpdatedate": 0,

			}
		}
	])

	return res.send({ data: orders })
}

exports.adminOrderShippingStatusUpdate = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	try {
		let shipping = await ALL_MODELS.orderShippingNew.findOne({ "_id": req.body.orderShippingId })
			.populate([
				{
					path: 'orderId',
					populate: [
						{ path: 'customerId', select: ['_id', 'firstName', 'lastName', 'emailAddress', 'indexNo', 'mobilePhone'] }
					]
				},
				{ path: 'sellerId', select: ['sellerDetails', 'nameOfBussinessEnglish', 'sellerAddress'] }
			]);

		if (!shipping) {
			return res.send({ message: "Please enter valid order shipping Id" })
		}

		//check if order is cancelled or delivered
		let currentStatus = await ALL_MODELS.orderStatusUpdate.findOne({ orderShippingId: shipping._id }).sort([['indexNo', '-1']]);
		if (currentStatus && (currentStatus.status.toLowerCase() == "cancelled" || currentStatus.status.toLowerCase() == "delivered" || currentStatus.status.toLowerCase() == "refunded")) {
			return res.status(403).send({ message: `Order status cannot be changed as it is ${currentStatus.status}` });
		}
		if (currentStatus.status == (req.body.status)) {
			return res.status(403).send({ message: "Order status cannot changed" })
		}

		let lastOrderStatusIndex = await ALL_MODELS.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
		if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }

		let shippingStatus = new ALL_MODELS.orderStatusUpdate({
			status: req.body.status,
			orderShippingId: req.body.orderShippingId,
			updatedBy: "Admin",
			indexNo: lastOrderStatusIndex['indexNo'] + 1
		})
		await shippingStatus.save()

		//Sending Notification
		//getting orderItems
		let orderItems = await ALL_MODELS.orderItems.find({ "orderId": shipping.orderId._id, sellerId: shipping.sellerId })

		shipping.customernumber = shipping.orderId.customerId.indexNo
		shipping.orderItems = orderItems
		shipping.customername = shipping.orderId.customerDelhiveryDetails.billingDetails.customerName
		shipping.ShippindAddress = `${shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine1}${shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine2 ? '</br>' + shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine2 : ''}${shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine3 ? '<br>' + shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine3 : ''}<br>${(shipping.orderId.customerDelhiveryDetails.shippingDetails.city) ? shipping.orderId.customerDelhiveryDetails.shippingDetails.city : ''}<br>${(shipping.orderId.customerDelhiveryDetails.shippingDetails.state) ? shipping.orderId.customerDelhiveryDetails.shippingDetails.state : ''} ${(shipping.orderId.customerDelhiveryDetails.shippingDetails.pincode) ? shipping.orderId.customerDelhiveryDetails.shippingDetails.pincode : ''}<br> ${(shipping.orderId.customerDelhiveryDetails.shippingDetails.poBox) ? shipping.orderId.customerDelhiveryDetails.shippingDetails.poBox : ''}`

		shipping.SellerAddress = `${shipping.sellerId.sellerAddress.companyAddress.companyAdd1}${shipping.sellerId.sellerAddress.companyAddress.companyAdd2 ? '<br>' + shipping.sellerId.sellerAddress.companyAddress.companyAdd2 : ''}<br>${shipping.sellerId.sellerAddress.companyAddress.companyCity} ${shipping.sellerId.sellerAddress.companyAddress.companyPincode}<br>${shipping.sellerId.sellerAddress.companyAddress.companypoBox}<br>${shipping.sellerId.sellerAddress.companyAddress.companyblockNumber}`
		shipping.ordernumber = shipping.orderId.indexNo + '-' + shipping.indexNo
		shipping.sellername = shipping.sellerId.nameOfBussinessEnglish
		shipping.shippingStatus = shippingStatus
		shipping.trackingnumber = shipping.indexNo

		var customerNotification = null
		var sellerNotification = null
		if (req.body.status == 'Delivered') {
			customerNotification = '3'
			sellerNotification = '20'
		}
		else if (req.body.status == 'Shipped') {
			customerNotification = '2'
		}

		if (customerNotification) {
			await sendNotification(req, req.userId, shipping.orderId.customerId, customerNotification, shipping, 'order status', shipping._id)

			if (req.body.status == 'Delivered') {
				for (let item of orderItems) {
					//Sending notification to review product
					productname = item.productVariantDetails[0].productVariantName
					item.productname = productname
					await sendNotification(req, req.userId, shipping.orderId.customerId, '18', item, 'order status', item.productVariantId)
				}
			}
		}
		if (sellerNotification) {
			await sendNotification(req, req.userId, shipping.sellerId._id, sellerNotification, shipping, 'order status', shipping._id)
		}
		//End Sending Notification

		return res.send({ message: "Order status has been updated!" })
	}
	catch (error) {
		return res.status(403).send({ "message": error.message })
	}
}

exports.adminCancelOrder = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	try {
		let shipping = await ALL_MODELS.orderShippingNew.findOne({ "_id": req.body.orderShippingId })
			.populate([
				{
					path: 'orderId',
					populate: {
						path: 'customerId'
					}
				},
				{ path: 'sellerId', select: ['_id', 'sellerDetails', 'nameOfBussinessEnglish'] }
			]);

		if (!shipping) {
			return res.send({ message: "Please enter valid order shipping Id" })
		}

		let update = { status: req.body.status, cancelComment: req.body.cancelComment }
		let updateStatus = await ALL_MODELS.orderStatusUpdate.updateOne({ "orderShippingId": req.body.orderShippingId }, { $set: update })

		let orderItemList = await ALL_MODELS.orderItems.find({ "orderId": shipping.orderId._id })
		//For Notification
		data = {}
		data.shippingPrice = shipping.shippingPrice
		data.customername = shipping.orderId.customerId.firstName.toUpperCase()
		data.sellername = shipping.sellerId.nameOfBussinessEnglish
		data.ordernumber = shipping.orderId.indexNo + '_' + shipping.indexNo
		data.order = shipping.orderId
		data.orderItemList = orderItemList
		data.CancellationReason = "Admin Cancelled"

		//For Customer
		await sendNotification(req, req.userId, shipping.orderId.customerId._id, '59', data, 'order', data.order._id)
		//For Seller
		sendNotification(req, null, shipping.sellerId._id, '60', data, 'order', data.order._id)
		//End Sending Notification

		return res.send({ message: "Order has been cancelled!" })
	}
	catch (error) {
		return res.status(403).send({ "message": error.message })
	}
}

exports.adminCancelProduct = async (req, res, next) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	try {
		let orderproduct = await ALL_MODELS.orderItems.findOne({ "_id": req.body.id })
		if (!orderproduct) {
			return res.send({ messgae: "No Found" })
		}

		let shipping = await ALL_MODELS.orderShippingNew.findOne({
			orderId: orderproduct.orderId,
			sellerId: orderproduct.sellerId
		})

		let shippingStatus = await ALL_MODELS.orderStatusUpdate.findOne({
			orderShippingId: shipping._id
		}).sort([['indexNo', '-1']]);

		if (shippingStatus.status === "Delivered") {
			return res.status(403).send({ message: "This product can't be cancelled it's already delivered" })
		} else if (shippingStatus.status === "Shipped") {
			return res.status(403).send({ message: "This product can't be cancelled it's already shipped" })
		}

		orderproduct.Cancelled = req.body.Cancelled
		orderproduct.CancelledComment = req.body.CancelledComment
		orderproduct.CancelledBy = "Admin"
		orderproduct.CancelledDateTime = new Date()
		let data = await orderproduct.save()

		//orderstatusupdate validation failed: status: `true` is not a valid enum value for path `status`.
		let orderproductList = await ALL_MODELS.orderItems.find({ "orderId": orderproduct.orderId })

		if (orderproductList.length == 1) {
			let orderShipping = await ALL_MODELS.orderShippingNew.findOne({
				orderId: orderproduct.orderId,
				sellerId: req.userId
			})
			if (orderShipping) {
				/* let orderShippingStatus = await ALL_MODELS.orderStatusUpdate.findOne({
					orderShippingId: orderShipping._id
				}) */
				// if (orderShippingStatus) {
				let lastOrderStatusIndex = await ALL_MODELS.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
				if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }
				let shippingStatus = new ALL_MODELS.orderStatusUpdate({
					status: "Cancelled",
					orderShippingId: orderShipping._id,
					updatedBy: "Admin",
					indexNo: lastOrderStatusIndex['indexNo'] + 1
				});
				await shippingStatus.save()
				// }
			}
		}

		return res.send({ data: data, message: "product has been cancelled!" })
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}
}


exports.excelOrderExport = async (req, res) => {

	let { search, paymentMethod, status, sellerCountry, customerCountry } = req.body;

	let filterSearch = {};
	let filter = {};

	if (paymentMethod) {
		try {
			filter["$and"] = [{ paymentMethod: { $in: paymentMethod } }]
		} catch (error) {
			console.log(error.message);
		}

	}

	if (status) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ orderStatus: { $in: status } }]
			} else {
				filter["$and"].push({ orderStatus: { $in: status } });
			}
		} catch (error) {
			console.log(error.message);
		}

	}

	if (sellerCountry) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "seller.sellerFilterCountry": { $in: sellerCountry } }]
			} else {
				filter["$and"].push({ "seller.sellerFilterCountry": { $in: sellerCountry } });
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	if (customerCountry) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } }]
			} else {
				filter["$and"].push({ "customerDelhiveryDetails.shippingDetails.country": { $in: customerCountry } });
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	if (search) {
		if (isNaN(parseInt(search))) {
			//console.log(search.split(" "))
			const regexp = new RegExp(search, "i");
			filterSearch["$or"] = [
				{ "paymentMethod": regexp },
				{ "customer.fullName": regexp },
				{ "customerDelhiveryDetails.shippingDetails.country": regexp },
				{ "seller.nameOfBussinessEnglish": regexp },
				{ "seller.sellerCountry": regexp },
				{ "order_shipping_id": regexp }
			];
		}
		if (!isNaN(parseInt(search))) {
			if (!filterSearch["$or"]) { filterSearch["$or"] = [] }

			let totalPrice = { $gt: parseFloat(search) - 1, $lt: parseFloat(search) + 1 };
			// console.log(totalPrice);
			filterSearch["$or"].push({ "indexNo": parseInt(search) });
			filterSearch["$or"].push({
				"totalPrice": totalPrice
			});
		}

	}

	let orderItemFilter = {
		$expr: {
			$and: [
				{ $eq: ["$orderId", "$$orderId"] },
				{ $eq: ["$sellerId", "$$sellerId"] }
			]
		}
	}


	const orderShipping = await ALL_MODELS.orderModel.aggregate([
		{
			$lookup: {
				from: "ordershippings",
				localField: "_id",
				foreignField: "orderId",
				as: "orderShippings",
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
		{ $unwind: "$orderShippings" },
		{
			$lookup: {
				from: "orderstatusupdates",
				localField: "orderShippings._id",
				foreignField: "orderShippingId",
				as: "orderStatusUpdate",
			}
		},
		{
			$lookup: {
				from: "sellers",
				localField: "orderShippings.sellerId",
				foreignField: "_id",
				as: "sellers",
			},
		},
		{ $addFields: { orderStatus: { $last: "$orderStatusUpdate.status" } } },
		{
			$lookup: {
				from: "orderitems",
				let: {
					orderId: "$orderShippings.orderId",
					sellerId: "$orderShippings.sellerId",
				},
				pipeline: [
					{
						$match: orderItemFilter
					}
				],
				as: "orderItems",
			},
		},
		{ $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
		{
			$project: {
				customer: 1,
				customerDelhiveryDetails: 1,
				orderShippings: 1,
				seller: {
					nameOfBussinessEnglish: { $first: "$sellers.nameOfBussinessEnglish" },
					sellerCountry: { $replaceAll: { input: { $first: "$sellers.sellerCountry" }, find: "_", replacement: " " } },
					sellerFilterCountry: { $first: "$sellers.sellerCountry" }
				},
				subscriptionId: 1,
				paymentMethod: 1,
				orderItems: 1,
				totalPrice: { $sum: "$orderItems.grandTotal" },
				indexNo: 1,
				order_shipping_id: { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
				orderStatus: 1
			}
		},
		{
			$project: {
				"customer.tapCustomerId": 0,
				"customer.__v": 0,
				"customer.password": 0,
				"customer.expireOtp": 0,
				"customer.otp": 0,
				"customer.resetpasswordtoken": 0,
				"customer.emailAddressVerified": 0,
				"customer.mobilePhoneVerified": 0,
				"customer.googleLoginId": 0,
				"customer.referralCode": 0,
			}
		},
		{ $match: filterSearch },
		{ $match: filter },
		{ $sort: { "orderShippings._id": -1 } }
	])

	let excelExportData = []

	for (let index = 0; index < orderShipping.length; index++) {
		let element = orderShipping[index]
		let createdDate = new Date(element.orderShippings.createdAt);

		excelExportData.push({
			"Order#": element.indexNo,
			"Seller": element.seller.nameOfBussinessEnglish,
			"Total Price": element.totalPrice,
			"Payment Method": element.paymentMethod,
			"Customer Name": element.customer.fullName,
			"Billing Address": element.customerDelhiveryDetails.billingDetails.addressLine1 + " " + element.customerDelhiveryDetails.billingDetails.addressLine2,
			"Shipping Address": element.customerDelhiveryDetails.shippingDetails.addressLine1 + " " + element.customerDelhiveryDetails.shippingDetails.addressLine2,
			"Order Date": `${createdDate.getDate()}-${createdDate.getMonth() + 1}-${createdDate.getFullYear()} ${createdDate.toLocaleTimeString()}`
		})
	}

	var wb = XLSX.utils.book_new(); //new workbook
	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();
	var down = `uploads/reports/orderlistExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`

	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);


	let newReport = new ALL_MODELS.reportModel({
		adminId: req.userId,
		ReportName: "orderlistExcel",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
	})

	let data = await newReport.save()

	return res.send({ message: "Your download will begin now.", data: data })

}

exports.returnRefundedProductWithSearch = async (req, res) => {
	let { search, paymentMethod, orderShippingStatus, returnStatus, refundStatus, cancelledStatus } = req.body;
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
	let filterSearch = {};
	let filter = {};

	if (paymentMethod) {
		try {
			filter["$and"] = [{ paymentMethod: { $in: paymentMethod } }]
		} catch (error) {
			console.log(error.message);
		}
	}

	if (orderShippingStatus) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ orderShippingStatus: { $in: orderShippingStatus } }]
			} else {
				filter["$and"].push({ orderShippingStatus: { $in: orderShippingStatus } });
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	if (returnStatus) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "orderItem.Returned": { $in: returnStatus } }]
			} else {
				filter["$and"].push({ "orderItem.Returned": { $in: returnStatus } });
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	if (refundStatus) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "orderItem.Refunded": { $in: refundStatus } }]
			} else {
				filter["$and"].push({ "orderItem.Refunded": { $in: refundStatus } });
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	if (cancelledStatus) {
		try {
			if (!filter["$and"]) {
				filter["$and"] = [{ "orderItem.Cancelled": { $in: cancelledStatus } }]
			} else {
				filter["$and"].push({ "orderItem.Cancelled": { $in: cancelledStatus } });
			}
		} catch (error) {
			console.log(error.message);
		}
	}

	if (search) {
		if (isNaN(parseInt(search))) {
			//console.log(search.split(" "))
			const regexp = new RegExp(search, "i");
			filterSearch["$or"] = [
				{ "paymentMethod": regexp },
				{ "orderShippingStatus": regexp },
				{ "customer.fullName": regexp },
				{ "seller.nameOfBussinessEnglish": regexp },
				{ "order_shipping_id": regexp },
				{ "orderItem.productVariantDetails.productVariantName": regexp }
			];
		}
		if (!isNaN(parseInt(search))) {
			if (!filterSearch["$or"]) { filterSearch["$or"] = [] }

			let totalPrice = { $gt: parseFloat(search) - 1, $lt: parseFloat(search) + 1 };
			filterSearch["$or"].push({ "indexNo": parseInt(search) });
			filterSearch["$or"].push({ "orderItem.indexNo": parseInt(search) });
			filterSearch["$or"].push({ "orderItem.quantity": parseInt(search) });
			filterSearch["$or"].push({ "orderItem.grandTotal": totalPrice });
		}
	}

	try {
		let orderItemFilter = {
			$expr: {
				$and: [
					{ $eq: ["$orderId", "$$orderId"] },
					{ $eq: ["$sellerId", "$$sellerId"] },
					{
						$or: [
							{ $eq: ["$Returned", true] },
							{ $eq: ["$Refunded", true] },
							{ $eq: ["$Cancelled", true] },
						]
					}
				]
			}
		}

		const orderShipping = await ALL_MODELS.orderModel.aggregate([
			{
				$lookup: {
					from: "ordershippings",
					localField: "_id",
					foreignField: "orderId",
					as: "orderShippings",
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
			{ $unwind: "$orderShippings" },
			{
				$lookup: {
					from: "orderstatusupdates",
					localField: "orderShippings._id",
					foreignField: "orderShippingId",
					as: "orderStatusUpdate",
				}
			},

			{
				$lookup: {
					from: "sellers",
					localField: "orderShippings.sellerId",
					foreignField: "_id",
					as: "sellers",
				},
			},
			{ $addFields: { orderShippingStatus: { $last: "$orderStatusUpdate.status" } } },
			{
				$lookup: {
					from: "orderitems",
					let: {
						orderId: "$orderShippings.orderId",
						sellerId: "$orderShippings.sellerId"
					},
					pipeline: [{ $match: orderItemFilter }],
					as: "orderItem",
				},
			},
			{ $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
			{
				$project: {
					customer: 1,
					//customerDelhiveryDetails: 1,
					orderShippings: 1,
					seller: {
						nameOfBussinessEnglish: { $first: "$sellers.nameOfBussinessEnglish" },
						sellerCountry: { $replaceAll: { input: { $first: "$sellers.sellerCountry" }, find: "_", replacement: " " } },
						sellerFilterCountry: { $first: "$sellers.sellerCountry" }
					},
					subscriptionId: 1,
					paymentMethod: 1,
					orderItem: 1,
					indexNo: 1,
					order_shipping_id: { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
					orderShippingStatus: 1
				}
			},
			{
				$project: {
					"customer.tapCustomerId": 0,
					"customer.__v": 0,
					"customer.password": 0,
					"customer.expireOtp": 0,
					"customer.otp": 0,
					"customer.resetpasswordtoken": 0,
					"customer.emailAddressVerified": 0,
					"customer.mobilePhoneVerified": 0,
					"customer.googleLoginId": 0,
					"customer.referralCode": 0,
				}
			},
			{ $match: { orderItem: { $ne: [] } } },
			{ $unwind: "$orderItem" },
			{ $match: filterSearch },
			{ $match: filter },
			{ $sort: { "orderShippings._id": -1 } },
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

		const orderShippingList = orderShipping.length ? orderShipping[0].paginatedResults : [];
		let totalCount = 0
		try {
			totalCount = orderShipping[0].totalCount[0].count
		} catch (err) { }

		return res.send({ totalCount: totalCount, count: orderShippingList.length, data: orderShippingList })

	} catch (error) {
		return res.status(500).send({
			message: error.message,
		});
	}
}

exports.addRefundDetails = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	let { _id, refundedAmount, refundedComment, refundedTo, refundChargesPaidBy } = req.body;
	if (!mongoose.Types.ObjectId.isValid(_id)) {
		return res.status(403).send({ message: "Invalid order item id" });
	}

	let orderItem = await ALL_MODELS.orderItems.findOne({ _id: _id })
		.populate([
			{
				path: "sellerId", select: ["nameOfBussinessEnglish", "sellerDetails"]
			}
		]);

	if (!orderItem) {
		return res.status(403).send({ message: "Invalid order item" });
	}
	let order = await ALL_MODELS.orderModel.findOne({ _id: orderItem.orderId._id })
		.populate([
			{ path: "customerId", select: ["firstName", "lastName", "emailAddress"] }
		]);


	let RefundedTransaction = null;

	if (order && order.paymentMethod == "ONLINE" && order.payment && (refundedTo == "TAP" || refundedTo == "WALLET")) {
		if (order.payment._id && refundedTo == "TAP") {
			//order.payment._id
			let postData = {
				"charge_id": order.payment._id,
				"amount": refundedAmount,
				"currency": order.payment.transaction.currency,
				"description": "Refund proceeded by admin",
				"reason": "requested_by_customer"
			}

			const options = {
				method: 'POST',
				uri: 'https://api.tap.company/v2/refunds',
				body: postData,
				json: true,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
				}
			}

			request(options)
				.then(function (response) {
					RefundedTransaction = response;
				}).catch(function (err) {
					console.log(err);
				})
		}
		else if (refundedTo == "WALLET") {
			addRefundToWalletTransaction({
				customerId: order.customerId,
				refundedAmount: refundedAmount,
				user: req.userId,
				order: order
			})
		}

	}
	//If Order payment is COD then Refund allowed only if orderitem is returned == true
	if (order && order.paymentMethod == "CASH" && orderItem.Returned == false) {
		return res.status(403).send({ message: "Invalid refund requested" });
	}
	if (order && order.paymentMethod == "CASH" && orderItem.Returned == true) {
		addRefundToWalletTransaction({
			customerId: order.customerId,
			refundedAmount: refundedAmount,
			user: req.userId,
			order: order
		})
	}

	let today = new Date();

	orderItem.RefundedBy = "Admin";
	orderItem.RefundedAmount = refundedAmount;
	orderItem.RefundedComment = refundedComment;
	orderItem.RefundedTo = refundedTo;
	orderItem.Refunded = true;
	orderItem.RefundedDateTime = today;
	orderItem.RefundChargesPaidBy = refundChargesPaidBy;
	orderItem.RefundedTransaction = RefundedTransaction;

	let data = await orderItem.save();

	let orderShipping = await ALL_MODELS.orderShippingNew.findOne({ orderId: orderItem.orderId, sellerId: orderItem.sellerId._id })

	//check if order has only one product or more
	let orderItemList = await ALL_MODELS.orderItems.find({ orderId: order._id })
	if (orderItemList.length == 1) {
		let lastOrderStatusIndex = await ALL_MODELS.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
		if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }

		let shippingStatus = new ALL_MODELS.orderStatusUpdate({
			status: "Refunded",
			orderShippingId: orderShipping._id,
			updatedBy: "Admin",
			indexNo: lastOrderStatusIndex['indexNo'] + 1
		})
		await shippingStatus.save()
	}

	//Notification Work
	if (orderShipping) {
		data.amount = refundedAmount
		data.customername = order.customerId.firstName.toUpperCase()
		data.sellername = orderItem.sellerId.nameOfBussinessEnglish
		data.productname = orderItem.productVariantDetails[0].productVariantName
		data.ordernumber = order.indexNo + '-' + orderShipping.indexNo
		await sendNotification(req, req.userId, order.customerId, '13', data, 'Refund', data._id)
		await sendNotification(req, req.userId, orderItem.sellerId, '31', data, 'Refund', data._id)
	}


	return res.send({ message: "Refund proceeded successfully", data: data });
}


const addRefundToWalletTransaction = async (data) => {
	try {
		console.log("Processing wallet transaction...");
		let walletData = await ALL_MODELS.walletModel.find({ customerId: data.customerId._id });
		let currentBalance = 0;

		//get current balance of customer
		if (walletData.length > 0) {
			let a = await ALL_MODELS.walletModel.find({ customerId: data.customerId._id }).sort({ _id: -1 }).limit(1);
			currentBalance = parseFloat(a[0].currentBalance);
		}

		if (!data.refundedAmount || data.refundedAmount <= 0) {
			return false;
			//return res.send({ message: "Amount must be greater then 0" });
		}

		let wallet = null;
		if (walletData.length == 0) {
			//first transaction (credit)			
			wallet = new ALL_MODELS.walletModel({
				customerId: data.customerId._id,
				transactionType: "credit",
				creditAmount: parseFloat(data.refundedAmount.toString()),
				fundBy: { id: data.user, userType: "Admin" },
				fundReason: "Refund by admin",
				fundRemarks: `Refund for order #${data.order.indexNo}`,
				fundPayment: {},
				orderId: data.order._id,
				orderIndexNo: data.order.indexNo,
				currentBalance: parseFloat(data.refundedAmount.toString())
			});
		} else if (walletData.length > 0) {
			wallet = new ALL_MODELS.walletModel({
				customerId: data.customerId._id,
				transactionType: 'credit',
				creditAmount: parseFloat(data.refundedAmount.toString()),
				fundBy: { id: data.user, userType: "Admin" },
				fundReason: "Refund by admin",
				fundRemarks: `Refund for order #${data.order.indexNo}`,
				fundPayment: {},
				orderId: data.order._id,
				orderIndexNo: data.order.indexNo,
				currentBalance: parseFloat(currentBalance + parseFloat(data.refundedAmount.toString())).toFixed(3)
			});
		}
		console.log(JSON.stringify(wallet))
		await wallet.save()
		return true;
		// return res.send({ message: "Transaction successfull", data: walletSave })
	} catch (error) {
		console.log("transaction error => ", error.message)
		return false;
		// return res.status(403).send({ message: error.message })
	}

}