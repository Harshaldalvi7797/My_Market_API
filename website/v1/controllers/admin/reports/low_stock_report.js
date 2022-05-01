const ALL_MODELS = require("../../../../../utilities/allModels");

var XLSX = require('xlsx');
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

exports.low_stock_report = async (req, res, next) => {

    let { limit, page,
        quantity_stock_start, quantity_stock_end,
        reorder_level_start, reorder_level_end, search
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

        let searchFilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
				{ "nameOfBussinessEnglish": regexp },
				{ "categoryNames.categoryDetails.categoryName": regexp },
			];
		}

        let filter = { $and: [] };
        filter["$and"].push( { $expr: { $lte: [{$toInt: "$inventoryQuantity"}, { $toInt: "$inventoryReOrderLevel" }] } });

        if (quantity_stock_start)
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_start] } })
        else {
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryQuantity" }, 0] } })
        }
        if (quantity_stock_end)
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_end] } })
        if (quantity_stock_start && quantity_stock_end) {
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_start] } })
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_end] } })
        }


        if (reorder_level_start)
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_start] } })
        if (reorder_level_end)
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_end] } })
        if (reorder_level_start && reorder_level_end) {
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_start] } })
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_end] } })
        }


        // Fetching low stock products
        let products = await ALL_MODELS.productVariant.aggregate([
            // Match
            { $match: filter },
            // lookup
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },
            // lookup
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            // Project 
            {
                $project: {
                    productVariantImages: 1, tags: 1, productVariantDetails: 1,
                    active: 1, productId: 1, brandId: 1, sellerId: 1, productSKU: 1,
                    productGrossPrice: 1, productNetPrice: 1, productTaxPercentage: 1,
                    productTaxPrice: 1, orderQuantityMax: 1, orderQuantityMin: 1,
                    inventoryQuantity: 1, inventoryReOrderLevel: 1, inventoryReOrderQuantity: 1,
                    shipmentWidth: 1, shipmentLength: 1, shipmentHeight: 1,
                    shipmentWeight: 1, subscription: 1, subscriptionPrice: 1,
                    subscriptionPriceWithoutTax: 1, subscriptionTaxAmount: 1, sale: 1,
                    saleTaxAmount: 1, salepricewithoutTax: 1, salePrice: 1,
                    salePricePercentage: 1, savingPercentage: 1,
                    seller: "$seller.sellerDetails",
                    nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                    productCategories: "$product.productCategories",
                    isLowStock: { $cmp: ["$inventoryQuantity", "$inventoryReOrderLevel"] },
                }
            },
            // Match
            {
                $match: {
                    isLowStock: { $lt: 1 }
                }
            },
            // lookup
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoryNames"
                }
            },
            { $match: searchFilter },
            // Project 
            {
                $project: {
                    isLowStock: 1,
                    // productVariantImages: 1, tags: 1,
                    productVariantDetails: 1,
                    active: 1, productId: 1, brandId: 1, sellerId: 1, productSKU: 1,
                    productGrossPrice: 1, productNetPrice: 1, productTaxPercentage: 1,
                    productTaxPrice: 1, orderQuantityMax: 1, orderQuantityMin: 1,
                    inventoryQuantity: 1, inventoryReOrderLevel: 1, inventoryReOrderQuantity: 1,
                    shipmentWidth: 1, shipmentLength: 1, shipmentHeight: 1,
                    shipmentWeight: 1, subscription: 1, subscriptionPrice: 1,
                    subscriptionPriceWithoutTax: 1, subscriptionTaxAmount: 1, sale: 1,
                    saleTaxAmount: 1, salepricewithoutTax: 1, salePrice: 1,
                    salePricePercentage: 1, savingPercentage: 1,
                    seller_name: {
                        $concat: ["$seller.sellerfName", " ", "$seller.sellerlName"]
                    },
                    nameOfBussinessEnglish: 1,
                    categoryNames: {
                        $map: {
                            input: "$categoryNames",
                            as: "categoryName",
                            in: {
                                _id: "$$categoryName._id",
                                categoryDetails: "$$categoryName.categoryDetails",
                            }
                        }
                    },
                }
            },

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

        let total_search_termsList = products.length ? products[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = products[0].totalCount[0].count
        } catch (err) { }
        return res.send({ totalCount: totalCount, count: total_search_termsList.length, data: total_search_termsList })

    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of low_stock_report

exports.lowStockExcel = async (req, res) => {
    let {
        quantity_stock_start, quantity_stock_end,
        reorder_level_start, reorder_level_end, search
    } = req.body;


    try {
        let searchFilter = {};
		if (search) {
			const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
				{ "nameOfBussinessEnglish": regexp },
				{ "categoryNames.categoryDetails.categoryName": regexp },
			];
		}

        let filter = { $and: [] };
        filter["$and"].push( { $expr: { $lte: [{$toInt: "$inventoryQuantity"}, { $toInt: "$inventoryReOrderLevel" }] } });

        if (quantity_stock_start)
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_start] } })
        else {
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryQuantity" }, 0] } })
        }
        if (quantity_stock_end)
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_end] } })
        if (quantity_stock_start && quantity_stock_end) {
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_start] } })
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryQuantity" }, quantity_stock_end] } })
        }


        if (reorder_level_start)
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_start] } })
        if (reorder_level_end)
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_end] } })
        if (reorder_level_start && reorder_level_end) {
            filter["$and"].push({ $expr: { $gte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_start] } })
            filter["$and"].push({ $expr: { $lte: [{ $toInt: "$inventoryReOrderLevel" }, reorder_level_end] } })
        }


        // Fetching low stock products
        let products = await ALL_MODELS.productVariant.aggregate([
            // Match
            { $match: filter },
            // lookup
            {
                $lookup: {
                    from: "sellers",
                    localField: "sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },
            // lookup
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            // Project 
            {
                $project: {
                    productVariantImages: 1, tags: 1, productVariantDetails: 1,
                    active: 1, productId: 1, brandId: 1, sellerId: 1, productSKU: 1,
                    productGrossPrice: 1, productNetPrice: 1, productTaxPercentage: 1,
                    productTaxPrice: 1, orderQuantityMax: 1, orderQuantityMin: 1,
                    inventoryQuantity: 1, inventoryReOrderLevel: 1, inventoryReOrderQuantity: 1,
                    shipmentWidth: 1, shipmentLength: 1, shipmentHeight: 1,
                    shipmentWeight: 1, subscription: 1, subscriptionPrice: 1,
                    subscriptionPriceWithoutTax: 1, subscriptionTaxAmount: 1, sale: 1,
                    saleTaxAmount: 1, salepricewithoutTax: 1, salePrice: 1,
                    salePricePercentage: 1, savingPercentage: 1,
                    seller: "$seller.sellerDetails",
                    nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                    productCategories: "$product.productCategories",
                    isLowStock: { $cmp: ["$inventoryQuantity", "$inventoryReOrderLevel"] },
                }
            },
            // Match
            {
                $match: {
                    isLowStock: { $lt: 1 }
                }
            },
            // lookup
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoryNames"
                }
            },
            { $match: searchFilter },
            // Project 
            {
                $project: {
                    isLowStock: 1,
                    // productVariantImages: 1, tags: 1,
                    productVariantDetails: 1,
                    active: 1, productId: 1, brandId: 1, sellerId: 1, productSKU: 1,
                    productGrossPrice: 1, productNetPrice: 1, productTaxPercentage: 1,
                    productTaxPrice: 1, orderQuantityMax: 1, orderQuantityMin: 1,
                    inventoryQuantity: 1, inventoryReOrderLevel: 1, inventoryReOrderQuantity: 1,
                    shipmentWidth: 1, shipmentLength: 1, shipmentHeight: 1,
                    shipmentWeight: 1, subscription: 1, subscriptionPrice: 1,
                    subscriptionPriceWithoutTax: 1, subscriptionTaxAmount: 1, sale: 1,
                    saleTaxAmount: 1, salepricewithoutTax: 1, salePrice: 1,
                    salePricePercentage: 1, savingPercentage: 1,
                    seller_name: {
                        $concat: ["$seller.sellerfName", " ", "$seller.sellerlName"]
                    },
                    nameOfBussiness: 1,
                    categoryNames: {
                        $map: {
                            input: "$categoryNames",
                            as: "categoryName",
                            in: {
                                _id: "$$categoryName._id",
                                categoryDetails: "$$categoryName.categoryDetails",
                            }
                        }
                    },
                }
            },
        ]);

        var wb = XLSX.utils.book_new(); //new workbook

        let excelExportData = []

        for (let index = 0; index < products.length; index++) {
            const element = products[index];
            // console.log("element", element)

            let a = {


                ProductVariantNameEnglish: null,
                ProductVariantNameArabic: null,
                QuantityInStock: element.inventoryQuantity,
                ReOrderLevel: element.inventoryReOrderLevel,


                CategoryNameEnglish: null,
                CategoryNameArabic: null,
                sellerName: element.nameOfBussinessEnglish

            };
            for (let i = 0; i < element.productVariantDetails.length; i++) {
                const ele = element.productVariantDetails[i];

                if (i == 0) {
                    a.ProductVariantNameEnglish = ele.productVariantName;
                }
                else if (i == 1) {
                    a.ProductVariantNameArabic = ele.productVariantName;
                }
            }
            for (let i = 0; i < element.categoryNames.length; i++) {
                const eleCat = element.categoryNames[i];
                // console.log("eleCat", eleCat.categoryDetails)
                for (let index = 0; index < eleCat.categoryDetails.length; index++) {

                    const element = eleCat.categoryDetails[index];
                    // console.log("category",element)
                    if (index == 0) {
                        a.CategoryNameEnglish = element.categoryName;
                    }
                    else if (index == 1) {
                        a.CategoryNameArabic = element.categoryName;
                    }
                }


            }
            excelExportData.push(a)
        }


        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();
        let folder = `uploads/reports/low-stock-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);
        var down = `${folder}low-stock-report${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);
        let newReport = new ALL_MODELS.reportModel({
            adminId: req.userId,
            ReportName: "Low Stock Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
        })

        let data = await newReport.save()
        return res.send({ message: "Your download will begin now.", d: data })
    } catch (error) { return res.status(403).send({ message: error.message }); }
}




