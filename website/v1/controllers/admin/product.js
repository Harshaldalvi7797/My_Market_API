const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");
let mongoose = require("mongoose");
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
let upload = require("./../../middlewares/fileUpload");
var XLSX = require('xlsx');

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

exports.productExcelExport = async (req, res) => {
	let { search } = req.body;
	const filter = {};
	if (search) {
		const regexp = new RegExp(search, "i");
		filter["$or"] = [

			{ "productDetails.productName": regexp },
			{ "brands.brandDetails.brandName": regexp },
			{ "firstLevel.categoryDetails.categoryName": regexp },
			{ "secondLevel.categoryDetails.categoryName": regexp },
			{ "thirdLevel.categoryDetails.categoryName": regexp },
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}
	let product = await ALL_MODELS.product.aggregate([
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
				from: "categories",
				localField: "productCategories.categoryLevel1Id",
				foreignField: "_id",
				as: "firstLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "productCategories.categoryLevel2Id",
				foreignField: "_id",
				as: "secondLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "productCategories.categoryLevel3Id",
				foreignField: "_id",
				as: "thirdLevel"
			}
		},
		{ $sort: { "indexNo": -1 } },
		{ $match: filter },
	])

	var wb = XLSX.utils.book_new(); //new workbook
	let excelExportData = []

	for (let index = 0; index < product.length; index++) {
		const element = product[index];
		let a = {
			Id: element._id,
			IndexNo: element.indexNo,
			ProductNameEnglish: null,
			ProductNameArabic: null,
			AdminApproval: element.adminApproval,
			CreatedAt: element.createdAt,
			UpdatedAt: element.updatedAt,
			ActiveWeb: element.activeWeb,
		};
		for (let i = 0; i < element.productDetails.length; i++) {
			const ele = element.productDetails[i];

			if (i == 0) {
				a.ProductNameEnglish = ele.productName;
			}
			else if (i == 1) {
				a.ProductNameArabic = ele.productName;
			}
		}
		excelExportData.push(a)
	}
	var temp = JSON.stringify(excelExportData);
	temp = JSON.parse(temp);
	var ws = XLSX.utils.json_to_sheet(temp);
	let today = new Date();
	let folder = `uploads/reports/admin-product/${req.userId}/`;
	//check if folder exist or not if not then create folder user createdirectory middleware
	await createDirectories(folder);
	var down = `${folder}admin-product_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
	XLSX.utils.book_append_sheet(wb, ws, "sheet1");
	XLSX.writeFile(wb, down);
	let newReport = new ALL_MODELS.reportModel({
		sellerId: req.userId,
		ReportName: "Admin Main Product Report",
		ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
	})

	let data = await newReport.save()
	return res.send({ message: "Your download will begin now.", d: data })


}

exports.productWithSearch = async (req, res) => {

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

			{ "productDetails.productName": regexp },
			{ "brands.brandDetails.brandName": regexp },
			{ "firstLevel.categoryDetails.categoryName": regexp },
			{ "secondLevel.categoryDetails.categoryName": regexp },
			{ "thirdLevel.categoryDetails.categoryName": regexp },
		];
		if (parseInt(search) != NaN) {
			filter["$or"].push({ "indexNo": parseInt(search) })
		}
	}

	let product = await ALL_MODELS.product.aggregate([
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
				from: "categories",
				localField: "productCategories.categoryLevel1Id",
				foreignField: "_id",
				as: "firstLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "productCategories.categoryLevel2Id",
				foreignField: "_id",
				as: "secondLevel"
			}
		},
		{
			$lookup: {
				from: "categories",
				localField: "productCategories.categoryLevel3Id",
				foreignField: "_id",
				as: "thirdLevel"
			}
		},

		{
			$project: {
				"brands.createdAt": 0,
				"brands.updatedAt": 0,
				"brands.__v": 0,
				"brands.active": 0,
				"firstLevel.active": 0,
				"firstLevel.adminApproval": 0,
				"firstLevel.child": 0,
				"firstLevel.createdAt": 0,
				"firstLevel.updatedAt": 0,
				"firstLevel.__v": 0,
				"firstLevel.active": 0,
				"secondLevel.adminApproval": 0,

				"secondLevel.child": 0,
				"secondLevel.createdAt": 0,
				"secondLevel.updatedAt": 0,
				"secondLevel.__v": 0,

				"secondLevel.active": 0,
				"thirdLevel.adminApproval": 0,
				"thirdLevel.child": 0,
				"thirdLevel.createdAt": 0,
				"thirdLevel.updatedAt": 0,
				"thirdLevel.__v": 0,
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
	const productList = product.length ? product[0].paginatedResults : [];

	let totalCount = 0
	try {
		totalCount = product[0].totalCount[0].count
	} catch (err) { }
	return res.send({ totalCount: totalCount, count: productList.length, data: productList });
}

exports.productvariantWithProductId = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	try {
		let { search, brands, status, subscription, startDate, endDate } = req.body;
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
				{ "parentcategories.categoryDetails.categoryName": regexp },
				{ "products.productDetails.productName": regexp },
				{ "brands.brandDetails.brandName": regexp }
			];
			if (parseInt(search) != NaN) {
				filter["$or"].push({ "indexNo": parseInt(search) })
			}
		}

		if (brands || status || subscription || startDate || endDate) {
			filter["$and"] = [];
		}
		if (brands) {
			filter["$and"].push({ "brands.brandDetails.brandName": { $in: brands } });
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

		let productVariants = await ALL_MODELS.productVariant.aggregate([
			{ $match: { "productId": mongoose.Types.ObjectId(req.body.productId) } },
			{
				$lookup: {
					from: 'products', localField: 'productId',
					foreignField: '_id', as: 'products'
				}
			},
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
		const productVarintsList = productVariants.length ? productVariants[0].paginatedResults : [];

		let totalCount = 0
		try {
			totalCount = productVariants[0].totalCount[0].count
		} catch (err) { }
		return res.send({ totalCount: totalCount, count: productVarintsList.length, data: productVarintsList });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}
}
exports.productvariantWithProductIdExcel = async (req, res) => {
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
		{ $match: { "productId": mongoose.Types.ObjectId(req.body.productId) } },

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



exports.addProduct = async (req, res) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	let reqData = req.body;
	for (let index = 0; index < reqData.productCategories.length; index++) {
		const element = reqData.productCategories[index];
		if (element.categoryLevel1Id) {
			let checkCategoryLevel1 = await ALL_MODELS.category.findOne({ "_id": element.categoryLevel1Id, "categoryLevel": "1" })

			if (!checkCategoryLevel1) {
				return res.send({ message: "Please enter valid parent category" })
			}
		}
		if (element.categoryLevel2Id) {
			let checkCategoryLevel2 = await ALL_MODELS.category.findOne({ "_id": element.categoryLevel2Id, "categoryLevel": "2" })

			if (!checkCategoryLevel2) {
				return res.send({ message: "Please enter valid second level category" })
			}
		}
		if (element.categoryLevel3Id) {
			let checkCategoryLevel3 = await ALL_MODELS.category.findOne({ "_id": element.categoryLevel3Id, "categoryLevel": "3" })

			if (!checkCategoryLevel3) {
				return res.send({ message: "Please enter valid third level category" })
			}
		}
	}
	let brand = await ALL_MODELS.brand.find({
		_id: reqData.brandId
	}).populate({ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] });

	if (!brand) { return res.status(403).send({ message: "Please enter valid brand" }); }

	for (let index = 0; index < reqData.productDetails.length; index++) {
		const element = reqData.productDetails[index];

		console.log("element.productName", element.productName)
		let sameProduct = await ALL_MODELS.product.findOne({ "productDetails.productName": element.productName })
			.populate([{ path: 'brandId', select: ["-active", "-photoCover", "-photoThumbnail"] },
			{
				path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
					"-categoryThumbnailImage", "-isParent"]
			}]);
		if (sameProduct) {
			return res.status(409).send({ d: sameProduct, message: "This product is already available in My Market." })
		}
	}
	try {
		const newproduct = new ALL_MODELS.product({
			productDetails: reqData.productDetails,
			productCategories: reqData.productCategories,
			tags: reqData.tags,
			groupTags: reqData.groupTags,
			sellerId: req.sellerId || null,
			brandId: reqData.brandId,
			adminApproval: true,
			active: true

		});
		let data = await newproduct.save();
		return res.send({ message: "Main Product has been added.", d: data });
	} catch (error) {
		return res.status(403).send({ error: error });
	}
};

exports.childCategories = async (req, res) => {
	try {
		let childCategory = await ALL_MODELS.category.find({ "parentCategoryId": req.query.parentCategory })

		return res.send({ count: childCategory.length, data: childCategory })

	}
	catch (error) {
		return error
	}
}

exports.brandsDropdown = async (req, res) => {
	let brands = await ALL_MODELS.brand.find()
		.select(["_id", "brandDetails.brandName"])

	return res.send({ d: brands })
}

exports.categoryDropdown = async (req, res) => {
	try {
		let parentCategory = await ALL_MODELS.category.find({ "categoryLevel": "1" })

		return res.send({ count: parentCategory.length, data: parentCategory })
	}
	catch (error) {
		return error
	}

	// let category = await ALL_MODELS.category.find()
	// 	.select(["_id", "categoryDetails.categoryName"])

	// return res.send({ d: category })
}
exports.getProducts = async (req, res) => {
	try {
		const products = await ALL_MODELS.product.aggregate([
			{
				$facet: {
					result: [
						{
							$skip:
								!req.query.skip || req.query.skip == 0
									? 0
									: parseInt(req.query.skip),
						},
						{
							$limit:
								!req.query.limit || req.query.limit == 0
									? 5
									: parseInt(req.query.limit),
						},
					],
					totalCount: [{ $count: "totalCount" }],
				},
			},
		]);

		return res.send({
			products: products[0].result,
			count: products[0].result.length,
			totalCount: products[0].totalCount[0].totalCount,
		});
	} catch (error) {
		res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

exports.getProduct = async (req, res) => {
	try {
		const productId = req.params.id;
		let product = await ALL_MODELS.product.findOne({ _id: productId });
		if (!product)
			return res.status(404).send({
				message: "There was no product found with given information!",
			});
		return res.send(product);
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

exports.updateProduct = async (req, res) => {
	try {
		let product = await ALL_MODELS.product.findOne({
			_id: req.params.id
		})
		if (!product) {
			return res.status(404).send({ message: "Invalid Product Id" });
		}

		let tags = {}
		let reqData = req.body
		let categories = [];
		for (let i = 0; i < reqData['productCategories'].length; i++) {
			let category = await ALL_MODELS.category.findOne({
				_id: reqData['productCategories'][i].id
			});
			if (category) {
				categories.push({ categoryId: category._id, active: true })
			}
		}

		product.productDetails = req.body.productDetails ? req.body.productDetails : product.productDetails;
		product.productCategories = req.body.productCategories ? req.body.productCategories : product.productCategories;

		product.active = req.body.active ? req.body.active : product.active;
		product.adminApproval = req.body.adminApproval ? req.body.adminApproval : product.adminApproval;
		product.brandId = req.body.brandId ? req.body.brandId : product.brandId;
		//array update
		tags = req.body.tags ? req.body.tags : tags
		product.tags = tags


		await product.save();
		return res.send({ message: "Main Product has been updated.", d: product });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

exports.deleteProduct = async (req, res) => {
	try {
		const productId = req.params.id;
		let product = await ALL_MODELS.product.findOneAndRemove({
			_id: productId,
		});
		if (!product)
			return res.status(404).send({
				message: "There was no product found with given information!",
			});

		res.send({ message: "Product has been deleted.", product });
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};
exports.productSearch = async (req, res) => {
	if (req.body.search.length > 2) {
		var search = req.body.search;

		let products = await ALL_MODELS.product.find({
			$or: [
				{ "productDetails.productName": new RegExp(search, "i") },
				{ "productDetails.productDescription": new RegExp(search, "i") }
			]
		})
		//   .populate([
		//    { path: 'productCategories.categoryId', select: ["-active", "-categoryCoverImage",
		// 	"-categoryThumbnailImage", "-isParent"] }]);


		if (products.length == 0) {
			return res.send({ message: "There was no product found with given information!", count: products.length, products })
		}

		return res.send({ message: "products", count: products.length, products })

		//    async (err, data) => {
		// 		if (err) { return res.status(403).send({ error: err }); }
		// 		var RESPONSE_DATA = [];

		// 		if (data.length == 0) {
		// 			  return res.send({ count: data.length,  RESPONSE_DATA });
		// 		}

		// 		data.forEach(async (el, i) => {
		// 			  var variant = await ALL_MODELS.productVariant.find({
		// 					"productId": el._id,
		// 			  }).select(["productVariantImages.path"]);

		// 			  //console.log(variant)
		// 			  var a = { productDetails: [], tags: [], _id: '', productVariantCount: 0, brand: '', productCategories: '' };
		// 			  a.productVariantCount = variant.length;
		// 			  a.productVariants = variant;
		// 			  a._id = el['_id'];
		// 			  a.tags = el['tags'];
		// 			  a.productDetails = el['productDetails'];
		// 			  a.brand = el['brandId'];
		// 			  a.productCategories = el['productCategories'];
		// 			  // a.productVariantImages = variant.productVariantImages
		// 			  //console.log(a);
		// 			  RESPONSE_DATA.push(a);

		// 			  if (i == data.length - 1) {
		// 					return res.send({ count: data.length, data});
		// 			  }
		// 		});




		//   })

	} else {
		return res.send({ message: "Search string must be greater the 2 characters" });
	}
}


exports.getProductByBrandId = async (req, res, next) => {
	let brandId = req.query.brandId;

	var valid = mongoose.Types.ObjectId.isValid(brandId);
	if (!valid) {
		return res.status(402).send({ message: "Invalid brand id" });
	}
	let product = await ALL_MODELS.product.find({
		brandId: brandId,
	})
	return res.status(201).send({ data: product })

}

exports.adminApprovalProduct = async (req, res, next) => {
	const validationError = validationResult(req);
	if (!validationError.isEmpty()) {
		return res.status(403).send({ message: validationError.array() });
	}
	try {
		if (!mongoose.Types.ObjectId.isValid(req.body.productId)) {
			return res.send({ message: "There was no product found with given information!" })
		}

		let product = await ALL_MODELS.product.findByIdAndUpdate(req.body.productId);
		if (!product) {
			return res.status(403).send({ message: "No product found by the given information!" });
		}
		product.adminApproval = req.body.adminApproval
		product.save()
		return res.send({ message: "Product approved by Admin" });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}


}

exports.updateProductStatus = async (req, res, next) => {
	try {

		if (!mongoose.Types.ObjectId.isValid(req.body.productId)) {
			return res.send({ message: "There was no product found with given information!" })
		}

		let product = await ALL_MODELS.product.findByIdAndUpdate(req.body.productId);
		if (!product) {
			return res.status(403).send({ message: "No product found by the given information!" });
		}
		product.active = req.body.active
		product.save()
		return res.send({ message: "Main Product has been updated." });
	}
	catch (error) {
		return res.status(403).send({ message: error.message });
	}
}
