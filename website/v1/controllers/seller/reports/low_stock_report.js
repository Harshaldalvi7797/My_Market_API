const path = require("path");
var XLSX = require('xlsx');

// Third party modules
const { ObjectId } = require("mongoose").Types;
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
// Local modules

const ALL_MODELS = require("../../../../../utilities/allModels");



const low_stock_report = async (req, res, next) => {

    let {
        quantity_stock_start, quantity_stock_end,
        reorder_level_start, reorder_level_end, search, limit, page
    } = req.body;


    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    try {

        const sellerId = ObjectId(req.userId);
        let filter = {};

        let Searchfilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            if (parseInt(search).toString().toLowerCase() != 'nan') {
                Searchfilter["$or"] = [
                    { "inventoryQuantity": parseInt(search) },
                    { "inventoryReOrderLevel": parseInt(search) }
                ]
            } else {
                Searchfilter["$or"] = [
                    { "productVariantDetails.productVariantName": regexp },
                    { "categoryLevel1.categoryDetails.categoryName": regexp },
                    { "categoryLevel2.categoryDetails.categoryName": regexp },
                    { "categoryLevel3.categoryDetails.categoryName": regexp },
                ];
            }
        }

        // console.log(quantity_stock_start, quantity_stock_end)

        if (quantity_stock_start) {
            // quantity_stock_start = quantity_stock_start - 1;
            if (quantity_stock_start < 0) { quantity_stock_start = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryQuantity: { $gte: quantity_stock_start } });
        }
        if (quantity_stock_end) {
            // quantity_stock_end = quantity_stock_end + 1;
            if (quantity_stock_end < 0) { quantity_stock_end = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryQuantity: { $lte: quantity_stock_end } });
        }


        if (reorder_level_start) {
            // reorder_level_start = reorder_level_start - 1
            if (reorder_level_start < 0) { reorder_level_start = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryReOrderLevel: { $gte: reorder_level_start } })
        }
        if (reorder_level_end) {
            // reorder_level_end = reorder_level_end + 1
            if (reorder_level_end < 0) { reorder_level_end = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryReOrderLevel: { $lte: reorder_level_end } })
        }

        //console.log(filter, sellerId);

        // Fetching low stock products
        const low_stock_products = await ALL_MODELS.productVariant.aggregate([
            // Match
            { $match: { "sellerId": sellerId } },

            // lookup
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            // Project 
            {
                $project: {
                    "productVariantDetails.pv_language": 1,
                    "productVariantDetails.productVariantName": 1,
                    "product.productDetails": 1,
                    active: 1, sellerId: 1, productSKU: 1,
                    orderQuantityMax: 1, orderQuantityMin: 1, inventoryReOrderQuantity: 1,
                    productCategories: { $first: "$product.productCategories" },
                    inventoryReOrderLevel: { $toInt: "$inventoryReOrderLevel" },
                    inventoryQuantity: { $toInt: "$inventoryQuantity" },
                }
            },
            // Match
            { $match: filter },
            // lookup
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoryLevel1"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel2Id",
                    foreignField: "_id",
                    as: "categoryLevel2"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel3Id",
                    foreignField: "_id",
                    as: "categoryLevel3"
                }
            },
            // Project 
            {
                $project: {
                    isLowStock: { $lt: ["$inventoryQuantity", "$inventoryReOrderLevel"] },
                    "productVariantDetails.pv_language": 1,
                    "productVariantDetails.productVariantName": 1,
                    active: 1, product: 1, sellerId: 1, productSKU: 1,
                    orderQuantityMax: 1, orderQuantityMin: 1, inventoryReOrderLevel: 1,
                    inventoryQuantity: 1, inventoryReOrderQuantity: 1,

                    categoryLevel1: {
                        $map: {
                            input: "$categoryLevel1",
                            as: "categoryLevel1",
                            in: { $first: "$$categoryLevel1.categoryDetails.categoryName" }
                        }
                    },

                    categoryLevel2: {
                        $map: {
                            input: "$categoryLevel2",
                            as: "categoryLevel2",
                            in: { $first: "$$categoryLevel2.categoryDetails.categoryName" }
                        }
                    },
                    categoryLevel3: {
                        $map: {
                            input: "$categoryLevel3",
                            as: "categoryLevel3",
                            in: { $first: "$$categoryLevel3.categoryDetails.categoryName" }
                        }
                    },
                }

            },
            { $match: { isLowStock: true } },
            { $match: Searchfilter },
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
        ]);

        let totalCount = 0
        try {
            totalCount = low_stock_products[0].totalCount[0].count
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            count: low_stock_products[0].paginatedResults.length,
            data: low_stock_products.length ? low_stock_products[0].paginatedResults : []
        });


    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of low_stock_report
const low_stock_report_excel = async (req, res, next) => {

    let {
        quantity_stock_start, quantity_stock_end,
        reorder_level_start, reorder_level_end, search
    } = req.body;


    try {
        const sellerId = ObjectId(req.userId);
        let filter = {};

        let Searchfilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

            if (parseInt(search).toString().toLowerCase() != 'nan') {
                Searchfilter["$or"] = [
                    { "inventoryQuantity": parseInt(search) },
                    { "inventoryReOrderLevel": parseInt(search) }
                ]
            } else {
                Searchfilter["$or"] = [
                    { "productVariantDetails.productVariantName": regexp },
                    { "categoryLevel1.categoryDetails.categoryName": regexp },
                    { "categoryLevel2.categoryDetails.categoryName": regexp },
                    { "categoryLevel3.categoryDetails.categoryName": regexp },
                ];
            }
        }

        // console.log(quantity_stock_start, quantity_stock_end)

        if (quantity_stock_start) {
            // quantity_stock_start = quantity_stock_start - 1;
            if (quantity_stock_start < 0) { quantity_stock_start = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryQuantity: { $gte: quantity_stock_start } });
        }
        if (quantity_stock_end) {
            // quantity_stock_end = quantity_stock_end + 1;
            if (quantity_stock_end < 0) { quantity_stock_end = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryQuantity: { $lte: quantity_stock_end } });
        }


        if (reorder_level_start) {
            // reorder_level_start = reorder_level_start - 1
            if (reorder_level_start < 0) { reorder_level_start = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryReOrderLevel: { $gte: reorder_level_start } })
        }
        if (reorder_level_end) {
            // reorder_level_end = reorder_level_end + 1
            if (reorder_level_end < 0) { reorder_level_end = 0 }
            if (!filter['$and']) { filter['$and'] = [] }
            filter['$and'].push({ inventoryReOrderLevel: { $lte: reorder_level_end } })
        }

        //console.log(filter);

        // Fetching low stock products
        const low_stock_products = await ALL_MODELS.productVariant.aggregate([
            // Match
            { $match: { "sellerId": sellerId } },

            // lookup
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            // Project 
            {
                $project: {
                    "productVariantDetails.pv_language": 1,
                    "productVariantDetails.productVariantName": 1,
                    "product.productDetails": 1,
                    active: 1, sellerId: 1, productSKU: 1,
                    orderQuantityMax: 1, orderQuantityMin: 1, inventoryReOrderQuantity: 1,
                    productCategories: { $first: "$product.productCategories" },
                    inventoryReOrderLevel: { $toInt: "$inventoryReOrderLevel" },
                    inventoryQuantity: { $toInt: "$inventoryQuantity" },
                }
            },
            // Match
            { $match: filter },
            // lookup
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoryLevel1"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel2Id",
                    foreignField: "_id",
                    as: "categoryLevel2"
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel3Id",
                    foreignField: "_id",
                    as: "categoryLevel3"
                }
            },
            // Project 
            {
                $project: {
                    isLowStock: { $lt: ["$inventoryQuantity", "$inventoryReOrderLevel"] },
                    "productVariantDetails.pv_language": 1,
                    "productVariantDetails.productVariantName": 1,
                    active: 1, product: 1, sellerId: 1, productSKU: 1,
                    orderQuantityMax: 1, orderQuantityMin: 1, inventoryReOrderLevel: 1,
                    inventoryQuantity: 1, inventoryReOrderQuantity: 1,

                    categoryLevel1: {
                        $map: {
                            input: "$categoryLevel1",
                            as: "categoryLevel1",
                            in: { $first: "$$categoryLevel1.categoryDetails.categoryName" }
                        }
                    },

                    categoryLevel2: {
                        $map: {
                            input: "$categoryLevel2",
                            as: "categoryLevel2",
                            in: { $first: "$$categoryLevel2.categoryDetails.categoryName" }
                        }
                    },
                    categoryLevel3: {
                        $map: {
                            input: "$categoryLevel3",
                            as: "categoryLevel3",
                            in: { $first: "$$categoryLevel3.categoryDetails.categoryName" }
                        }
                    },
                }

            },
            { $match: { isLowStock: true } },
            { $match: Searchfilter },
        ]);


        //console.log("low_stock_products", low_stock_products.categoryNames.categoryDetails)
        // for (let index = 0; index < low_stock_products.categoryNames.length; index++) {
        //     const element = low_stock_products.categoryNames[index];

        //     console.log(element)

        // }

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = []

        for (let index = 0; index < low_stock_products.length; index++) {
            const element = low_stock_products[index];
            // console.log("categoryNames", element.categoryNames)


            let a = {
                Id: element._id,
                ProductNameEnglish: null,
                ProductNameArabic: null,
                ProductVariantNameEnglish: null,
                ProductVariantNameArabic: null,
                CategoryLevel1: null,
                CategoryLevel2: null,
                CategoryLevel3: null,
                QuantityInStock: element.inventoryQuantity,
                InventoryReOrderLevel: element.inventoryReOrderLevel
            };


            for (let i = 0; i < element.categoryLevel1.length; i++) {
                const e = element.categoryLevel1[i];
                a.CategoryLevel1 = e
            }
            for (let i = 0; i < element.categoryLevel2.length; i++) {
                const e = element.categoryLevel2[i];
                a.CategoryLevel2 = e
            }
            for (let i = 0; i < element.categoryLevel3.length; i++) {
                const e = element.categoryLevel3[i];
                a.CategoryLevel3 = e
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

            for (let index = 0; index < element.product[0].productDetails.length; index++) {
                const el = element.product[0].productDetails[index];
                // console.log("el", el)

                if (index == 0) {
                    a.ProductNameEnglish = el.productName;
                    //console.log(el.productName)
                }
                else if (index == 1) {
                    a.ProductNameArabic = el.productName;
                    //console.log(el.productName)
                }
            }

            excelExportData.push(a)
        }
        // excelExportData.push(customer_purchased)
        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();
        let folder = `uploads/reports/seller-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);
        var down = `${folder}low_stock_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);
        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Low Stock Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
        })

        let data = await newReport.save()
        return res.send({ message: "Your XL will start downloading now.", d: data })


    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of low_stock_report

module.exports = { low_stock_report, low_stock_report_excel };