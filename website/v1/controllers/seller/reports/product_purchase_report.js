const path = require("path");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');
var XLSX = require('xlsx');
// Third party modules
const { ObjectId } = require("mongoose").Types;


// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");



const product_purchase_report = async (req, res, next) => {

    let {
        purchase,
        startDate, endDate,
        quantity_sold_start, quantity_sold_end,
        total_amount_start, total_amount_end,
        search, limit, page
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
        let dateFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            //  regexp = new RegExp(category, "i");
            filter["$or"] = [
                { "productVariant.productVariantDetails.productVariantName": regexp },
                { "categoryLevel1": regexp },
                { "customerName": regexp },
            ];
            if (parseInt(search).toString().toLowerCase() != 'nan') {
                filter["$or"].push({ "product_sold_count": parseInt(search) }),
                    filter["$or"].push({ "quantity_sold": parseInt(search) }),
                    filter["$or"].push({ "total_amount": parseInt(search) })
            }
        }
        // console.log(filter)

        if (quantity_sold_start || quantity_sold_end || total_amount_start || total_amount_end) {
            filter["$and"] = [];
        }
        if (startDate || endDate) {
            dateFilter["$and"] = [];
        }

        if (quantity_sold_start) {
            filter["$and"].push({ quantity_sold: { $gte: quantity_sold_start } });
        }
        if (quantity_sold_end) {
            filter["$and"].push({ quantity_sold: { $lte: quantity_sold_end } });
        }

        if (total_amount_start) {
            filter["$and"].push({ total_amount: { $gte: quantity_sold_start } });
        }
        if (total_amount_end) {
            filter["$and"].push({ total_amount: { $lte: quantity_sold_end } });
        }



        if (startDate) {
            startDate = new Date(startDate)
            startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
            startDate.setDate(startDate.getDate() - 1)
            let dt = convertDateTime(startDate);
            dateFilter['$and'].push({ "orders.createdDate": { $gte: dt } })
        }
        if (endDate) {
            endDate = new Date(endDate)
            endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
            // end_date.setDate(end_date.getDate() + 1)
            let dt = convertDateTime(endDate);
            dateFilter['$and'].push({ "orders.createdDate": { $lte: dt } })
        }

        if (dateFilter['$and']) {
            dateFilter['$and'].push({ orders: { $ne: null } });
        }
        // Fetching order products
        const products = await ALL_MODELS.orderItems.aggregate([
            // Match 
            // { $match: filter },

            // Joining orderProducts collection with orders collection
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            //Date range filter
            { $match: dateFilter },
            // Grouping based on productVarinatId
            {
                $group: {
                    _id: "$productVariantId",
                    product_sold_count: { $sum: { $add: 1 } },
                    quantity_sold: {
                        $sum: {
                            $add: { $toDouble: "$quantity" }
                        }
                    },
                    total_amount: {
                        $sum: {
                            $add: { $toDouble: "$grandTotal" }
                        }
                    },
                    firstOrderId: { $first: "$$ROOT.orderId" },
                    lastOrderId: { $last: "$$ROOT.orderId" },
                }
            },
            // Joining orderProducts collection with orders collection for first order
            {
                $lookup: {
                    from: "orders",
                    localField: "firstOrderId",
                    foreignField: "_id",
                    as: "firstOrder"
                }
            },
            { $unwind: "$firstOrder" },
            // Joining orderProducts collection with orders collection for last order
            {
                $lookup: {
                    from: "orders",
                    localField: "lastOrderId",
                    foreignField: "_id",
                    as: "lastOrder"
                }
            },
            { $unwind: "$lastOrder" },
            //Projection
            {
                $project: {
                    firstOrderDate: "$firstOrder.createdAt",
                    lastOrderDate: "$lastOrder.createdAt",
                    product_sold_count: 1,
                    quantity_sold: 1,
                    total_amount: 1,
                    _id: 1
                }
            },
            // Match 
            /* {
               $lookup: {
                   from: "customers",
                   localField: "orders.customerId",
                   foreignField: "_id",
                   as: "customers"
               }
           },*/
            // Joining orderProducts collection with productVariants collection
            {
                $lookup: {
                    from: "productvariants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productVariant"
                }
            },

            // Projection
            {
                $project: {
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: { $first: "$productVariant" },
                    firstOrderDate: 1, lastOrderDate: 1
                }
            },
            // Match
            { $match: { "productVariant.sellerId": sellerId } },

            // Joining orderProducts collection with products collection
            {
                $lookup: {
                    from: "products",
                    localField: "productVariant.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            // Projection
            {
                $project: {
                    orderProductCreatedAt: 1,
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: 1,
                    product: 1,
                    productCategories: { $first: "$product.productCategories" },
                    firstOrderDate: 1, lastOrderDate: 1
                }
            },

            // Joining orderProducts collection with categories collection
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

            // Projection
            {
                $project: {
                    orderProductCreatedAt: 1,
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    //orderDate: 1, createdAt: 1,
                    product: 1,
                    firstOrderDate: 1, lastOrderDate: 1,
                    productVariant: 1,
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
            { $match: filter },

            // Sorting
            {
                $sort: { lastOrderDate: -1 }
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
        ]);

        let totalCount = 0
        try {
            totalCount = products[0].totalCount[0].count
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            count: products[0].paginatedResults.length,
            data: products.length ? products[0].paginatedResults : []
        });


    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of product_purchase_report

const product_purchase_report_excel = async (req, res, next) => {

    let {
        purchase,
        startDate, endDate,
        quantity_sold_start, quantity_sold_end,
        total_amount_start, total_amount_end,
        search
    } = req.body;


    try {
        const sellerId = ObjectId(req.userId);
        let filter = {};
        let dateFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            //  regexp = new RegExp(category, "i");
            filter["$or"] = [
                { "productVariant.productVariantDetails.productVariantName": regexp },
                { "categoryLevel1": regexp },
                { "customerName": regexp },
            ];
            if (parseInt(search).toString().toLowerCase() != 'nan') {
                filter["$or"].push({ "product_sold_count": parseInt(search) }),
                    filter["$or"].push({ "quantity_sold": parseInt(search) }),
                    filter["$or"].push({ "total_amount": parseInt(search) })
            }
        }
        // console.log(filter)

        if (quantity_sold_start || quantity_sold_end || total_amount_start || total_amount_end) {
            filter["$and"] = [];
        }
        if (startDate || endDate) {
            dateFilter["$and"] = [];
        }

        if (quantity_sold_start) {
            filter["$and"].push({ quantity_sold: { $gte: quantity_sold_start } });
        }
        if (quantity_sold_end) {
            filter["$and"].push({ quantity_sold: { $lte: quantity_sold_end } });
        }

        if (total_amount_start) {
            filter["$and"].push({ total_amount: { $gte: quantity_sold_start } });
        }
        if (total_amount_end) {
            filter["$and"].push({ total_amount: { $lte: quantity_sold_end } });
        }



        if (startDate) {
            startDate = new Date(startDate)
            startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
            startDate.setDate(startDate.getDate() - 1)
            let dt = convertDateTime(startDate);
            dateFilter['$and'].push({ createdDate: { $gte: dt } })
        }
        if (endDate) {
            endDate = new Date(endDate)
            endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
            // end_date.setDate(end_date.getDate() + 1)
            let dt = convertDateTime(endDate);
            dateFilter['$and'].push({ createdDate: { $lte: dt } })
        }

        if (dateFilter['$and']) {
            dateFilter['$and'].push({ orders: { $ne: null } });
        }

        // Fetching order products
        const products = await ALL_MODELS.orderItems.aggregate([
            // Joining orderProducts collection with orders collection
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "orders"
                }
            },
            { $unwind: "$orders" },
            //Date range filter
            { $match: dateFilter },
            // Grouping based on productVarinatId
            {
                $group: {
                    _id: "$productVariantId",
                    product_sold_count: { $sum: { $add: 1 } },
                    quantity_sold: {
                        $sum: {
                            $add: { $toDouble: "$quantity" }
                        }
                    },
                    total_amount: {
                        $sum: {
                            $add: { $toDouble: "$grandTotal" }
                        }
                    },
                    firstOrderId: { $first: "$$ROOT.orderId" },
                    lastOrderId: { $last: "$$ROOT.orderId" },
                }
            },
            // Joining orderProducts collection with orders collection for first order
            {
                $lookup: {
                    from: "orders",
                    localField: "firstOrderId",
                    foreignField: "_id",
                    as: "firstOrder"
                }
            },
            { $unwind: "$firstOrder" },
            // Joining orderProducts collection with orders collection for last order
            {
                $lookup: {
                    from: "orders",
                    localField: "lastOrderId",
                    foreignField: "_id",
                    as: "lastOrder"
                }
            },
            { $unwind: "$lastOrder" },
            //Projection
            {
                $project: {
                    firstOrderDate: "$firstOrder.createdAt",
                    lastOrderDate: "$lastOrder.createdAt",
                    product_sold_count: 1,
                    quantity_sold: 1,
                    total_amount: 1,
                    _id: 1
                }
            },
            // Match 
            /* {
               $lookup: {
                   from: "customers",
                   localField: "orders.customerId",
                   foreignField: "_id",
                   as: "customers"
               }
           },*/
            // Joining orderProducts collection with productVariants collection
            {
                $lookup: {
                    from: "productvariants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productVariant"
                }
            },

            // Projection
            {
                $project: {
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: { $first: "$productVariant" },
                    firstOrderDate: 1, lastOrderDate: 1
                }
            },
            // Match
            { $match: { "productVariant.sellerId": sellerId } },

            // Joining orderProducts collection with products collection
            {
                $lookup: {
                    from: "products",
                    localField: "productVariant.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },

            // Projection
            {
                $project: {
                    orderProductCreatedAt: 1,
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: 1,
                    product: 1,
                    productCategories: { $first: "$product.productCategories" },
                    firstOrderDate: 1, lastOrderDate: 1
                }
            },

            // Joining orderProducts collection with categories collection
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

            // Projection
            {
                $project: {
                    orderProductCreatedAt: 1,
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    //orderDate: 1, createdAt: 1,
                    product: 1,
                    firstOrderDate: 1, lastOrderDate: 1,
                    productVariant: 1,
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
            { $match: filter },

            // Sorting
            {
                $sort: { lastOrderDate: -1 }
            },

        ]);

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = []

        for (let index = 0; index < products.length; index++) {
            const element = products[index];


            let a = {
                Id: element.productVariant._id,
                ProductNameEnglish: null,
                ProductNameArabic: null,
                ProductVariantNameEnglish: null,
                ProductVariantNameArabic: null,
                Category: null,
                /*CategoryLevel1: null,
                 CategoryLevel2: null,
                CategoryLevel3: null, */
                TotalAmount: element.total_amount,
                QuantitySold: element.quantity_sold,
            };

            for (let i = 0; i < element.categoryLevel1.length; i++) {
                const e = element.categoryLevel1[i];
                // a.CategoryLevel1 = e
                a.Category = e
            }
            /* for (let i = 0; i < element.categoryLevel2.length; i++) {
                const e = element.categoryLevel2[i];
                a.CategoryLevel2 = e
            }
            for (let i = 0; i < element.categoryLevel3.length; i++) {
                const e = element.categoryLevel3[i];
                a.CategoryLevel3 = e
            } */

            for (let index = 0; index < element.productVariant.productVariantDetails.length; index++) {
                const el = element.productVariant.productVariantDetails[index];
                // console.log("el", el)

                if (index == 0) {
                    a.ProductVariantNameEnglish = el.productVariantName;
                    //console.log(el.productVariantName)
                }
                else if (index == 1) {
                    a.ProductVariantNameArabic = el.productVariantName;
                    //console.log(el.productVariantName)
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

            //console.log(excelExportData)

        }


        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();
        let folder = `uploads/reports/seller-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);
        var down = `${folder}most_purchased_product_report_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);
        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Most Purchase Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
        })

        let data = await newReport.save()
        return res.send({ message: "Your XL will start downloading now.", d: data })

    } catch (error) { return res.status(403).send({ message: error.message }); }


}// End of product_purchase_report


const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);

    // this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}

module.exports = { product_purchase_report, product_purchase_report_excel };