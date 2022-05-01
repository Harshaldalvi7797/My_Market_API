const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
let mongoose = require("mongoose");
let upload = require("./../../middlewares/fileUpload");
var XLSX = require('xlsx');
let { sendNotification } = require("../../middlewares/sendNotification");

const convertDateTime = (createdAt) => {
	let date = createdAt;
	let year = date.getFullYear();
	let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
	let day = ("0" + date.getDate()).slice(-2);
	let hr = ("0" + date.getHours()).slice(-2);
	let min = ("0" + date.getMinutes()).slice(-2);
	let sec = ("0" + date.getSeconds()).slice(-2);

	return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}
exports.productVariantSubscriptionDvertisementCheckAdmin= async (req, res) => {

	// endDate > today
	const today = new Date();
	// today.setHours(0);
	// today.setMinutes(0);
	today.setSeconds(0);
	today.setMilliseconds(0);

	let datetime = convertDateTime(today);

	// console.log("datetime", datetime)
	let filter = {
		'$and': [

			// { "toDate": { $gte: datetime } },

			{ "status": "Active" },

		]
	}
	let subscriptionCheck = await ALL_MODELS.subscribeModel.aggregate([

		{ $match: { "productVariantId": mongoose.Types.ObjectId(req.body.productVariantId) } },
		{ $match: filter }
	])

	let adFilter = {
		'$and': [

			{ "endDateTime1": { $gte: datetime } },
			{ "adminApproval": true },
			{ "active": true },



		]
	}

	let advertiseProduct = await ALL_MODELS.advertisementCampaign.aggregate([
		{ $match: { "whatToPromote.id": mongoose.Types.ObjectId(req.body.productVariantId) } },
		{ $match: adFilter }
	])

	let RESPONSE = { subscription: subscriptionCheck, advertisement: advertiseProduct }
	return res.send({ data: RESPONSE })

}

exports.adminPvExcel = async (req, res) => {
	let { search, category, brands, status, subscription, startDate, endDate } = req.body;

	const filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [
			{ "productNetPrice": regexp },
			{ "productVariantDetails.productVariantName": regexp },
			{ "productSKU": regexp },
			{ "firstLevel.categoryDetails.categoryName": regexp },
			{ "secondLevel.categoryDetails.categoryName": regexp },
			{ "thirdLevel.categoryDetails.categoryName": regexp },
			{ "products.productDetails.productName": regexp },
			{ "brands.brandDetails.brandName": regexp }
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	if (category || brands || status || subscription || startDate || endDate) {
		filter["$and"] = [];
	}
	if (brands) {
		filter["$and"].push({ "brands.brandDetails.brandName": { $in: brands } });
	}
	if (category) {
		filter["$and"].push({ "firstLevel.categoryDetails.categoryName": { $in: category } });
	}
	if (status) {
		filter["$and"].push({ "active": { $in: status } });
	}
	if (subscription) {
		filter["$and"].push({ "subscription": { $in: subscription } });
	}
	if (startDate) {
		startDate = new Date(startDate)
		startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
		startDate.setDate(startDate.getDate() - 1)
		let dt = convertDateTime(startDate);
		filter['$and'].push({ createdDate: { $gt: dt } })
	}
	if (endDate) {
		endDate = new Date(endDate)
		endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
		let dt = convertDateTime(endDate);
		filter['$and'].push({ createdDate: { $lt: dt } })
	}

	let productVarints = await ALL_MODELS.productVariant.aggregate([

		{
			$lookup: {
				from: "brands",
				localField: "brandId",
				foreignField: "_id",
				as: "brands"
			}
		},
		{
			$lookup: {
				from: "products",
				localField: "productId",
				foreignField: "_id",
				as: "products"
			}
		},

		{
			$lookup: {
				from: "categories",
				localField: "products.productCategories.categoryLevel1Id",
				foreignField: "_id",
				as: "firstLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "products.productCategories.categoryLevel2Id",
				foreignField: "_id",
				as: "secondLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "products.productCategories.categoryLevel3Id",
				foreignField: "_id",
				as: "thirdLevel"
			}
		},
		{
			$lookup: {
				from: "sellers",
				localField: "sellerId",
				foreignField: "_id",
				as: "seller"
			}
		},
		{ $sort: { "indexNo": -1 } },
		{ $match: filter },
	])

	var wb = XLSX.utils.book_new(); //new workbook
	let excelExportData = []

	for (let index = 0; index < productVarints.length; index++) {
		const element = productVarints[index];
		let a = {
			IndexNo: element.indexNo,
			ProductNameEnglish: null,
			ProductNameArabic: null,
			ProductVariantNameEnglish: null,
			ProductVariantNameArabic: null,
			CategoryLevel1English: null,
			CategoryLevel1Arabic: null,
			BrandEnglish: null,
			BrandArabic: null,
			ProductVariantPrice: element.productNetPrice,
			Stock: element.inventoryQuantity,
			QuantityInStock: element.inventoryQuantity,
			InventoryReOrderLevel: element.inventoryReOrderLevel
		};

		for (let i = 0; i < element.firstLevel.length; i++) {
			const e = element.firstLevel[i];

			for (let il = 0; il < e.categoryDetails.length; il++) {
				const el = e.categoryDetails[il];

				if (il == 0) {
					a.CategoryLevel1English = el.categoryName;
				}
				else if (il == 1) {
					a.CategoryLevel1Arabic = el.categoryName;
				}
			}
		}

		for (let i = 0; i < element.productVariantDetails.length; i++) {
			const ele = element.productVariantDetails[i];

			if (i == 0) {
				a.ProductVariantNameEnglish = ele.productVariantName;
			}
			else if (i == 1) {
				a.ProductVariantNameArabic = ele.productVariantName;
			}
		}
		for (let index = 0; index < element.products[0].productDetails.length; index++) {
			const el = element.products[0].productDetails[index];


			if (index == 0) {
				a.ProductNameEnglish = el.productName;

			}
			else if (index == 1) {
				a.ProductNameArabic = el.productName;

			}
		}
		for (let index = 0; index < element.brands[0].brandDetails.length; index++) {
			const el = element.brands[0].brandDetails[index];

			if (index == 0) {
				a.BrandEnglish = el.brandName;

			}
			else if (index == 1) {
				a.BrandArabic = el.brandName;
			}
		}
		excelExportData.push(a)
	}

	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();
	let folder = `uploads/reports/admin-inventory/${req.userId}/`;
	//check if folder exist or not if not then create folder user createdirectory middleware
	await createDirectories(folder);
	var down = `${folder}admin-inventory_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);
	let newReport = new ALL_MODELS.reportModel({
		sellerId: req.userId,
		ReportName: "Seller Inventory Report",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
	})

	let data = await newReport.save()
	return res.send({ message: "Your download will begin now.", d: data })
}

exports.productvariantWithSearch = async (req, res) => {
	let { search, category, brands, status, subscription, startDate, endDate } = req.body;
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
			{ "productNetPrice": regexp },
			{ "productVariantDetails.productVariantName": regexp },
			{ "productSKU": regexp },
			{ "firstLevel.categoryDetails.categoryName": regexp },
			{ "secondLevel.categoryDetails.categoryName": regexp },
			{ "thirdLevel.categoryDetails.categoryName": regexp },
			{ "products.productDetails.productName": regexp },
			{ "brands.brandDetails.brandName": regexp }
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	if (category || brands || status || subscription || startDate || endDate) {
		filter["$and"] = [];
	}
	if (brands) {
		filter["$and"].push({ "brands.brandDetails.brandName": { $in: brands } });
	}
	if (category) {
		filter["$and"].push({ "firstLevel.categoryDetails.categoryName": { $in: category } });
	}
	if (status) {
		filter["$and"].push({ "active": { $in: status } });
	}
	if (subscription) {
		filter["$and"].push({ "subscription": { $in: subscription } });
	}
	if (startDate) {
		startDate = new Date(startDate)
		startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
		startDate.setDate(startDate.getDate() - 1)
		let dt = convertDateTime(startDate);
		filter['$and'].push({ createdDate: { $gt: dt } })
	}
	if (endDate) {
		endDate = new Date(endDate)
		endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
		// end_date.setDate(end_date.getDate() + 1)
		let dt = convertDateTime(endDate);
		filter['$and'].push({ createdDate: { $lt: dt } })
	}

	let productvariant = await ALL_MODELS.productVariant.aggregate([

		{
			$lookup: {
				from: "brands",
				localField: "brandId",
				foreignField: "_id",
				as: "brands"
			}
		},
		{
			$lookup: {
				from: "products",
				localField: "productId",
				foreignField: "_id",
				as: "products"
			}
		},

		{
			$lookup: {
				from: "categories",
				localField: "products.productCategories.categoryLevel1Id",
				foreignField: "_id",
				as: "firstLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "products.productCategories.categoryLevel2Id",
				foreignField: "_id",
				as: "secondLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "products.productCategories.categoryLevel3Id",
				foreignField: "_id",
				as: "thirdLevel"
			}
		},
		{
			$lookup: {
				from: "sellers",
				localField: "sellerId",
				foreignField: "_id",
				as: "seller"
			}
		},
		{ $sort: { "indexNo": -1 } },
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
	const productVarintsList = productvariant.length ? productvariant[0].paginatedResults : [];

	let totalCount = 0
	try {
		totalCount = productvariant[0].totalCount[0].count
	} catch (err) { }
	return res.send({ totalCount: totalCount, count: productVarintsList.length, data: productVarintsList });
}


exports.addProductvariant = async (req, res, next) => {

	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	let reqData = req.body;

	try {
		let product = await ALL_MODELS.product.findOne({
			_id: reqData.productId
		}).select(['-__v', '-createdAt', '-updatedAt']);

		if (!product) { return res.status(403).send({ message: "Invalid product id selected" }); }
		//add product variant record
		let lastIndex = await ALL_MODELS.productVariant.findOne().sort([['indexNo', '-1']]);
		if (!lastIndex) { lastIndex = {}; lastIndex['indexNo'] = 1000 }

		let newProductVariant = new ALL_MODELS.productVariant({
			currency: "BHD",
			productId: reqData.productId,
			brandId: product['brandId'],
			adminId: req.userId,
			active: true,
			adminApproval: true,
			sellerId: reqData.sellerId || null,

			productSKU: reqData.productSKU,
			productVariantDetails: reqData.productVariantDetails,

			productCurrency: reqData.productCurrency,
			productGrossPrice: reqData.productGrossPrice,
			productNetPrice: reqData.productNetPrice,
			productTaxPercentage: reqData.productTaxPercentage,
			productTaxName: reqData.productTaxName,
			productTaxPrice: reqData.productTaxPrice,

			orderQuantityMax: reqData.orderQuantityMax,
			orderQuantityMin: reqData.orderQuantityMin,

			inventoryQuantity: reqData.inventoryQuantity,
			inventoryReOrderLevel: reqData.inventoryReOrderLevel,
			inventoryReOrderQuantity: reqData.inventoryReOrderQuantity,

			sellerId: reqData.sellerId,
			shipmentWidth: reqData.shipmentWidth,
			shipmentLength: reqData.shipmentLength,
			shipmentHeight: reqData.shipmentHeight,
			shipmentWeight: reqData.shipmentWeight,

			subscription: reqData.subscription,
			subscriptionPrice: reqData.subscriptionPrice,
			subscriptionPriceWithoutTax: reqData.subscriptionPriceWithoutTax,
			subscriptionTaxAmount: reqData.subscriptionTaxAmount,

			sale: reqData.sale,
			saleTaxAmount: reqData.saleTaxAmount,
			salepricewithoutTax: reqData.salepricewithoutTax,
			salePrice: reqData.salePrice,
			salePricePercentage: reqData.salePricePercentage,

			savingPercentage: reqData.savingPercentage.toString(),

			tags: reqData.tags,
			codConveniencePrice: reqData.codConveniencePrice,
			domesticShippingPrice: reqData.domesticShippingPrice,
			internationalShippingPrice: reqData.internationalShippingPrice,
			additionalCod: reqData.additionalCod,
			indexNo: lastIndex.indexNo + 1
		});

		let data = await newProductVariant.save()
		return res.send({ message: "Product has been added.", d: data });

	}
	catch (error) {
		return res.status(500).send({ message: error });
	}
};

exports.adminupdateProductVariantPhoto = async (req, res, next) => {
	let productVariant = await ALL_MODELS.productVariant.findById({
		_id: req.params.id
	});
	if (!productVariant) {
		return res.status(404).send({ message: "Invalid Product variant Id" });
	}
	if (!req.body.photoOrder) {
		return res.status(401).json({ error: "Please enter photoOrder" });
	}


	let photoOrder = null;


	try {
		photoOrder = (req.body.photoOrder);

	} catch (error) {
		return res.status(403).send({ message: "photoOrder has invalid format" });
	}

	try {

		let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`
		await upload.fileUpload(req, next, "productVariantImages", uploadLocation);

		let filPath = req.filPath;
		let productImages = productVariant['productVariantImages'];
		if (productImages.length == 0) {
			productVariant['productVariantImages'] = filPath;
			await productVariant.save()
		}
		else if (productImages.length > 0) {
			let productVariantUpdate = await ALL_MODELS.productVariant.findById({
				_id: productVariant._id,
				sellerId: req.userId
			});


			for (let index = 0; index < filPath.length; index++) {
				const ele = filPath[index];
				let a = await productImages.findIndex(x => x.photoOrder.toString() === ele.photoOrder.toString());
				// console.log(a);

				if (a != -1) {
					// console.log(productVariantUpdate["productVariantImages"][a], ele)                    
					productImages[a].path = ele.path;
				} else {
					productImages.push({
						active: true,
						path: ele.path,
						photoOrder: ele.photoOrder
					});
				}
			}
			productVariantUpdate["productVariantImages"] = productImages;
			await productVariantUpdate.save();
		}
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}


	let productVariantData = await ALL_MODELS.productVariant.findOne({
		_id: req.params.id
	}).select(["productVariantImages"])
	return res.send({ message: "Product image has been uploaded.", d: productVariantData });

}

exports.adminUpdateProductVariant = async (req, res, next) => {
	const valid = mongoose.Types.ObjectId.isValid(req.params.id);

	if (!valid)
		return res.status(402).send({ message: "Invalid product variant id" });

	// Product variant id
	const _id = mongoose.Types.ObjectId(req.params.id)

	try {
		const productVariant = await ALL_MODELS.productVariant.findById({ "_id": req.params.id })
			.select(['-__v', '-createdAt', '-updatedAt']);
		console.log(productVariant)

		if (!productVariant)
			return res.status(404).send({ message: "Invalid Product variant Id" });

		//console.log(productVariant)
		let product = await ALL_MODELS.product.findOne({
			_id: req.body.productId
		});

		if (!product) { return res.status(403).send({ message: "Invalid product id selected" }); }


		//Array Update
		let productVariantDetails = {}
		productVariantDetails = req.body.productVariantDetails ? req.body.productVariantDetails : productVariant.productVariantDetails

		productVariant.productId = req.body.productId;
		productVariant.productVariantDetails = productVariantDetails
		productVariant.productSKU = req.body.productSKU || productVariant.productSKU
		productVariant.tags = req.body.tags || productVariant.tags

		productVariant.productCurrency = req.body.productCurrency || productVariant.productCurrency
		productVariant.productGrossPrice = req.body.productGrossPrice || productVariant.productGrossPrice
		productVariant.productNetPrice = req.body.productNetPrice || productVariant.productNetPrice
		//if net price is update 

		//offer check or price change save

		//coupon check or price change save if possible
		productVariant.productTaxPercentage = req.body.productTaxPercentage || productVariant.productTaxPercentage
		productVariant.productTaxPrice = req.body.productTaxPrice || productVariant.productTaxPrice
		productVariant.productTaxName = req.body.productTaxName || productVariant.productTaxName

		productVariant.orderQuantityMax = req.body.orderQuantityMax || productVariant.orderQuantityMax
		productVariant.orderQuantityMin = req.body.orderQuantityMin || productVariant.orderQuantityMin

		productVariant.inventoryQuantity = req.body.inventoryQuantity || productVariant.inventoryQuantity
		productVariant.inventoryReOrderLevel = req.body.inventoryReOrderLevel || productVariant.inventoryReOrderLevel
		productVariant.inventoryReOrderQuantity = req.body.inventoryReOrderQuantity || productVariant.inventoryReOrderQuantity

		productVariant.shipmentWidth = req.body.shipmentWidth || productVariant.shipmentWidth
		productVariant.shipmentLength = req.body.shipmentLength || productVariant.shipmentLength
		productVariant.shipmentHeight = req.body.shipmentHeight || productVariant.shipmentHeight
		productVariant.shipmentWeight = req.body.shipmentWeight || productVariant.shipmentWeight

		productVariant.subscription = (req.body.subscription != undefined) ? req.body.subscription : productVariant.subscription;
		productVariant.subscriptionPrice = req.body.subscriptionPrice || productVariant.subscriptionPrice
		productVariant.subscriptionPriceWithoutTax = req.body.subscriptionPriceWithoutTax || productVariant.subscriptionPriceWithoutTax
		productVariant.subscriptionTaxAmount = req.body.subscriptionTaxAmount || productVariant.subscriptionTaxAmount

		productVariant.additionalCod = req.body.additionalCod || productVariant.additionalCod
		productVariant.sale = req.body.sale || productVariant.sale
		productVariant.saleTaxAmount = req.body.saleTaxAmount || productVariant.saleTaxAmount;
		productVariant.salepricewithoutTax = req.body.salepricewithoutTax || productVariant.salepricewithoutTax;
		productVariant.salePrice = req.body.salePrice || productVariant.salePrice;
		productVariant.salePricePercentage = req.body.salePricePercentage || productVariant.salePricePercentage;

		productVariant.savingPercentage = (req.body.savingPercentage) ? req.body.savingPercentage.toString() : productVariant.savingPercentage.toString();
		productVariant.active = (req.body.active != undefined) ? req.body.active : productVariant.active;

		productVariant.domesticShippingPrice = (req.body.domesticShippingPrice) ? req.body.domesticShippingPrice.toString() : productVariant.domesticShippingPrice;
		productVariant.internationalShippingPrice = (req.body.internationalShippingPrice) ? req.body.internationalShippingPrice.toString() : productVariant.internationalShippingPrice;


		await productVariant.save();
		pvUpdateOffer(productVariant._id, req.body.productNetPrice);
		pvUpdateCoupon(productVariant._id, req.body.productNetPrice);

		return res.send({ message: "Product variant details has been updated.", domesticShippingPrice: req.body.domesticShippingPrice });



	} catch (error) {
		return res.status(500).send({ message: error.stack });
	}

}

const pvUpdateOffer = (productVariantId, netPrice) => {

}

const pvUpdateCoupon = (productVariantId, netPrice) => {

}

exports.promotionalVideoAdmin = async (req, res) => {
	productVariant = await ALL_MODELS.productVariant.findOne({ _id: req.body.productvariantId })

	if (!productVariant) {
		return res.status(404).send({ message: "There was no productVariant found with given information!" });
	}
	if (req.files) {
		let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}/promotionVideo`
		let fileUploadResponse = await upload.sellerFileUpload(req, 'promotionVideo', uploadLocation, 'mp4');

		if (fileUploadResponse != false) {
			productVariant['promotionVideo'] = req.filPath[0];
			await productVariant.save();
			return res.send({ message: "Video has been uploaded." });
		} else {
			return res.status(403).send({ message: "Please upload valid .mp4 file" });
		}
	} else {
		return res.status(403).send({ message: "Please upload video file" });
	}
}

exports.deletePromotionVideoAdmin = async (req, res) => {

	let productVariant = await ALL_MODELS.productVariant.findOne({ "_id": req.body.productVariantId })

	if (!productVariant) {
		return res.send({ message: "There was no productVariant found with given information!" })
	}
	if (req.body.promotionVideo == 0) {
		productVariant.promotionVideo = null
	}
	let data = await productVariant.save()

	return res.send({ message: "Video has been deleted.", data: data });
}

exports.adminAddvarintSpecs = async (req, res) => {
	let productVarint = await ALL_MODELS.productVariant.findById({ "_id": req.body.productvarintId })
	// console.log(req.body.productVariantSpecifications)
	if (!productVarint) {
		return res.send({ message: "No Found" })
	}
	productVarint.productVariantSpecifications = req.body.productVariantSpecifications ? req.body.productVariantSpecifications : productVarint.productVariantSpecifications

	let data = await productVarint.save()
	return res.send({ message: "Specifications have been added.", data: data })
}

exports.getAllProductVariants = async (req, res, next) => {

	try {
		let productvariants = await ALL_MODELS.productVariant
			.find()
			.select(["-__v", "-updatedAt", "-password"])
			.limit(parseInt(req.query.limit))
			.skip(parseInt(req.query.skip))
			.lean();
		let totalCount = await ALL_MODELS.productVariant.count();
		res.send({ count: productvariants.length, productvariants, totalCount });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}

}

exports.getSingleProductvariant = async (req, res) => {
	try {
		let productvariant = await ALL_MODELS.productVariant.findById(req.params.id)
			.populate([
				{ path: "sellerId", select: ["_id", "commissionPercentage"] },
			])

		return res.send({ data: productvariant });
	} catch (error) {
		return res.status(403).send({ message: error.message });

	}
}


exports.getProductVariant = async (req, res) => {
	try {
		const productId = req.params.id;
		let product = await ALL_MODELS.productVariant.findOne({ _id: productId });
		if (!product)
			return res.status(404).send({
				message: "There was no productVariant found with given information!",
			});
		return res.send(product);
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
}

exports.updatepeoductVariant = async (req, res, next) => {
	const valid = mongoose.Types.ObjectId.isValid(req.params.id);

	if (!valid)
		return res.status(402).send({ message: "Invalid product variant id" });

	// Product variant id
	const _id = mongoose.Types.ObjectId(req.params.id)

	try {
		const productVariant = await ALL_MODELS.productVariant.findById({ "_id": req.params.id })
			.select(['-__v', '-createdAt', '-updatedAt']);
		console.log(productVariant)

		if (!productVariant)
			return res.status(404).send({ message: "Invalid Product variant Id" });

		//console.log(productVariant)
		let product = await ALL_MODELS.product.findOne({
			_id: req.body.productId
		});

		if (!product) { return res.status(403).send({ message: "Invalid product id selected" }); }


		//Array Update
		let productVariantDetails = {}
		productVariantDetails = req.body.productVariantDetails ? req.body.productVariantDetails : productVariant.productVariantDetails

		productVariant.productVariantDetails = productVariantDetails
		productVariant.productSKU = req.body.productSKU ? req.body.productSKU : productVariant.productSKU
		productVariant.tags = req.body.tags ? req.body.tags : productVariant.tags

		productVariant.productCurrency = req.body.productCurrency ? req.body.productCurrency : productVariant.productCurrency
		productVariant.productGrossPrice = req.body.productGrossPrice ? req.body.productGrossPrice : productVariant.productGrossPrice
		productVariant.productNetPrice = req.body.productNetPrice ? req.body.productNetPrice : productVariant.productNetPrice

		productVariant.productTaxPercentage = req.body.productTaxPercentage ? req.body.productTaxPercentage : productVariant.productTaxPercentage
		productVariant.productTaxPrice = req.body.productTaxPrice ? req.body.productTaxPrice : productVariant.productTaxPrice
		productVariant.productTaxName = req.body.productTaxName ? req.body.productTaxName : productVariant.productTaxName

		productVariant.orderQuantityMax = req.body.orderQuantityMax ? req.body.orderQuantityMax : productVariant.orderQuantityMax
		productVariant.orderQuantityMin = req.body.orderQuantityMin ? req.body.orderQuantityMin : productVariant.orderQuantityMin

		productVariant.inventoryQuantity = req.body.inventoryQuantity ? req.body.inventoryQuantity : productVariant.inventoryQuantity
		productVariant.inventoryReOrderLevel = req.body.inventoryReOrderLevel ? req.body.inventoryReOrderLevel : productVariant.inventoryReOrderLevel
		productVariant.inventoryReOrderQuantity = req.body.inventoryReOrderQuantity ? req.body.inventoryReOrderQuantity : productVariant.inventoryReOrderQuantity

		productVariant.shipmentWidth = req.body.shipmentWidth ? req.body.shipmentWidth : productVariant.shipmentWidth
		productVariant.shipmentLength = req.body.shipmentLength ? req.body.shipmentLength : productVariant.shipmentLength
		productVariant.shipmentHeight = req.body.shipmentHeight ? req.body.shipmentHeight : productVariant.shipmentHeight
		productVariant.shipmentWeight = req.body.shipmentWeight ? req.body.shipmentWeight : productVariant.shipmentWeight

		productVariant.subscription = req.body.subscription ? req.body.subscription : productVariant.subscription
		productVariant.subscriptionPrice = req.body.subscriptionPrice ? req.body.subscriptionPrice : productVariant.subscriptionPrice
		productVariant.subscriptionPriceWithoutTax = req.body.subscriptionPriceWithoutTax ? req.body.subscriptionPriceWithoutTax : productVariant.subscriptionPriceWithoutTax
		productVariant.subscriptionTaxAmount = req.body.subscriptionTaxAmount ? req.body.subscriptionTaxAmount : productVariant.subscriptionTaxAmount
		productVariant.savingPercentage = req.body.savingPercentage ? req.body.savingPercentage.toString() : productVariant.savingPercentage.toString()
		productVariant.active = (req.body.active != undefined) ? req.body.active : productVariant.active

		let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`;


		await upload.fileUploadPath(req, next, "productVariantImages", uploadLocation);
		productVariant['productVariantImages'] = req.filPath ? req.filPath : productVariant['productVariantImages'];

		await productVariant.save();

		return res.send({ message: "Product variant details has been updated.", d: productVariant });


	} catch (error) {
		res.status(500).send({ message: error.stack });
	}
}

exports.updateStatus = async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
			return res.send({ message: "There was no product found with given information!" })
		}
		let productvariant = await ALL_MODELS.productVariant.findByIdAndUpdate(req.body.id);
		if (!productvariant) {
			return res.status(403).send({ message: "There was no product found with given information!" });
		}
		productvariant.active = req.body.active
		productvariant.save()
		return res.send({ message: "Product status has been updated." });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}
}

exports.adminApprovalStatus = async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
			return res.send({ message: "There was no product found with given information!" })
		}
		let productvariant = await ALL_MODELS.productVariant.findByIdAndUpdate(req.body.id);
		if (!productvariant) {
			return res.status(403).send({ message: "There was no product found with given information!" });
		}
		productvariant.adminApproval = req.body.adminApproval
		productvariant.save()
		return res.send({ message: "Product has been approved." });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}
}

exports.adminMultiStatusUpdate = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	let products = await ALL_MODELS.productVariant.find({ "_id": req.body.productVariantId })
		.select(["_id"])
	for (let index = 0; index < products.length; index++) {
		const element = products[index];
		// console.log(element._id)
		let update = { active: req.body.active }
		let updateStatus = await ALL_MODELS.productVariant.updateMany({ "_id": element._id }, { $set: update })
	}
	return res.send({ message: "Status has been updated." });
}

exports.admininventoryQuantityUpdate = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	let update = { inventoryQuantity: req.body.inventoryQuantity }

	let updateStatus = await ALL_MODELS.productVariant.findByIdAndUpdate({ "_id": req.body.productVariantId }, { $set: update })

	//Notification Work
	if (updateStatus.inventoryQuantity == '0') {
		//Sending Notification
		let NotifyMeUsers = await ALL_MODELS.notifyModel.find({ productVariantId: req.body.productVariantId, status: 0 })
			.populate([
				{ path: "customerId", select: ["firstName", "lastName"] },
				{ path: "productVariantId", select: ["productVariantDetails", '_id'] }
			]);

		for (let user of NotifyMeUsers) {
			try {
				user.customername = user.customerId.firstName.toUpperCase()
				user.productname = user.productVariantId.productVariantDetails[0].productVariantName
				await sendNotification(req, req.userId, user.customerId._id, '7', user, 'other', user.productVariantId._id)
			}
			catch (e) {

			}
		}
	}
	//End Notification Work
	return res.send({ message: "Inventory has been updated" })

}

exports.deleteProductVariant = async (req, res) => {
	try {
		const productId = req.params.id;
		let product = await ALL_MODELS.productVariant.findOneAndRemove({
			_id: productId,
		});
		if (!product)
			return res.status(404).send({
				message: "There was no productVariant found with given information!",
			});

		res.send({ message: "ProductVariant has been deleted.", product });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

exports.getProducts = async (req, res) => {
	try {
		let products = await ALL_MODELS.product
			.find()
			.select(["_id", "productDetails.p_language", "productDetails.productName"])
			.collation({ locale: "en" })
			.sort([['productDetails.productName', '1']])
			.limit(parseInt(req.query.limit))
			.skip(parseInt(req.query.skip))
			.lean();
		let totalCount = await ALL_MODELS.product.count();
		res.send({ count: products.length, products, totalCount });
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
}

exports.getBrands = async (req, res) => {
	try {
		let brands = await ALL_MODELS.brand
			.find()
			.select(["_id", "brandDetails.brandName"])
			.limit(parseInt(req.query.limit))
			.skip(parseInt(req.query.skip))
			.lean();
		let totalCount = await ALL_MODELS.brand.count();
		res.send({ count: brands.length, brands, totalCount });
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
}

exports.getProductVariantByProductId = async (req, res) => {

	let productVariants = await ALL_MODELS.product.aggregate([

		{
			$lookup: {
				from: 'productvariants', localField: 'productVarianttId',
				foreignField: '_id', as: 'pvs'
			}
		},
		{
			"$project": {
				"_id": 1,

				"productVarianttId": 1,

			}
		},
		{ $match: { "pvs._id": mongoose.Types.ObjectId(req.params.id) } }
	])
	return res.send({
		productVariants: productVariants[0].result,
		count: productVariants[0].result.length,
		totalCount: productVariants[0].totalCount[0].totalCount,
	});

}

exports.adminGetCategorySpecifications = async (req, res) => {
	let product = await ALL_MODELS.product.findById({ "_id": req.params.id })
		.select(["productCategories"])


	for (let index = 0; index < product.productCategories.length; index++) {
		const element = product.productCategories[index];
		// console.log(element)

		let categoryLevel3 = await ALL_MODELS.category.findOne({ "_id": element.categoryLevel3Id })
			.select(["_id", "categorySpecifications"])

		if (categoryLevel3 != null) {
			// console.log("categoryLevel3", categoryLevel3)
			return res.send({ data: categoryLevel3 })
		}


		let categoryLevel2 = await ALL_MODELS.category.findOne({ "_id": element.categoryLevel2Id })
			.select(["_id", "categorySpecifications"])

		if (categoryLevel2 != null) {
			return res.send({ data: categoryLevel2 })
		}
		let categoryLevel1 = await ALL_MODELS.category.findOne({ "_id": element.categoryLevel1Id })
			.select(["_id", "categorySpecifications"])

		if (categoryLevel1 != null) {
			return res.send({ data: categoryLevel1 })
		}


	}

	// return res.send({ product })

}




exports.dropDownCategoryFilter = async (req, res) => {
	let category = await ALL_MODELS.category.aggregate([

		{
			$lookup: {
				from: 'products',
				localField: '_id',
				foreignField: 'productCategories.categoryLevel1Id',
				as: 'productList'
			}
		},
		{ $match: { productList: { $ne: [] } } },
		{
			$lookup: {
				from: 'productvariants',
				localField: 'productList._id',
				foreignField: 'productId',
				as: 'productvariantList'
			}
		},
		{ $match: { productvariantList: { $ne: [] } } },
		{
			$project: {
				_id: 1,
				categoryDetails: 1,
				active: 1
				//'productList._id': 1,
				//'productList.productDetails': 1,
				//productvariantList: 1
			}
		}
	])

	return res.send({ count: category.length, data: category })
}

exports.dropDownBrandFilter = async (req, res) => {
	let brand = await ALL_MODELS.brand.aggregate([
		// { $match: { active: { $eq: true } } },
		{
			$lookup: {
				from: 'productvariants',
				localField: '_id',
				foreignField: 'brandId',
				as: 'productvariantList'
			}
		},
		{ $match: { productvariantList: { $ne: [] } } },
		{
			$project: {
				active: 0,
				adminApproval: 0,
				brandThumbnailImage: 0,
				createdAt: 0,
				updatedAt: 0,
				createdDate: 0,
				updatedDate: 0,
				indexNo: 0,
				__v: 0,
				productvariantList: 0

			}
		}
	])

	return res.send({ count: brand.length, data: brand })
}

exports.adminUpdateProductimageRemove = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}

	if (!req.body.photoOrder) {
		return res.status(403).send({ message: "Please enter photoOrder" })
	}
	let productVariant = await ALL_MODELS.productVariant.findById({
		_id: req.params.id
	}).select(["productVariantImages"])
	if (!productVariant) {
		return res.status(404).send({ message: "Invalid Product variant Id" });
	}

	let pvImages = productVariant['productVariantImages'];
	if (pvImages.length > 0) {
		let a = await pvImages.findIndex(x => x.photoOrder.toString() === req.body.photoOrder.toString());
		if (a != -1) {
			pvImages.splice(a, 1);
			let pv = await ALL_MODELS.productVariant.findById({
				_id: req.params.id,
				sellerId: req.userId
			})

			for (let index = 0; index < pvImages.length; index++) {
				pvImages[index].photoOrder = (index + 1);
			}

			pv['productVariantImages'] = pvImages;
			await pv.save()
			return res.send({ message: "Product image has been removed." });
		} else {
			return res.status(403).send({ message: "can't remove image, invalid image selected" })
		}
	} else {
		return res.status(403).send({ message: "No images found for selected product variant" })
	}

}




