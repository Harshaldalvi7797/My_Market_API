const ALL_MODELS = require("../../../../../utilities/allModels");
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const abandoned_cart_report = async (req, res, next) => {

    let { start_date, end_date, quantity_start, quantity_end, unit_price_start, unit_price_end, total_amount_start, total_amount_end, } = req.body;
    let { limit, page, search } = req.body;
    //pagination
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

        // Filter
        let filter = {};
        let sort = { _id: -1 };
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);

        if (start_date)
            filter.updatedAt = { $gt: new Date(start_date) }
        if (end_date)
            filter.updatedAt = { $lt: new Date(end_date) }
        if (start_date && end_date) {
            filter.updatedAt = {
                $gt: new Date(start_date),
                $lt: new Date(end_date)
            }
        }

        // Going to apply defalult 30 day date filter
        if (!start_date)
            filter.updatedAt = { $gt: defaultDate }


        /**
         * Filtering quantity, unit price and total quantity
         */
        const filterSecond = {
            "productVarinat.productUnitPrice": { $ne: null }
        };
        let searchFilter = {};

        //Search
        if (search) {//&& search.length > 2
            if (parseFloat(search).toString().toLowerCase() != 'nan') {
                searchFilter["$or"] = [
                    { total_amount: parseFloat(search) },
                    { total_quantity: parseFloat(search) }
                ]
            } else {
                let searchReg = new RegExp(search, "i");
                searchFilter["$or"] = [
                    { "productVarinat.productVariantDetails.productVariantName": searchReg },
                    { "seller": searchReg },
                    { "parentCategoryEnglish": searchReg },
                ]
                //console.log(JSON.stringify(searchFilter), searchReg)
            }

        }

        // quantity
        if (quantity_start && parseInt(quantity_start).toString() != 'nan') {
            if (quantity_start <= 0) { quantity_start = 0 }
            else { quantity_start = quantity_start - 1 }
            filterSecond.total_quantity = { $gt: quantity_start }
        }
        if (quantity_end && parseInt(quantity_end).toString() != 'nan') {
            if (quantity_end <= 0) { quantity_end = 0 }
            else { quantity_end = quantity_end + 1; }

            filterSecond.total_quantity = { $lt: quantity_end }
        }
        if (quantity_start && parseInt(quantity_start).toString() != 'nan' && quantity_end && parseInt(quantity_end).toString() != 'nan') {
            filterSecond.total_quantity = {
                $gt: quantity_start,
                $lt: quantity_end
            }
        }
        // End of quantity

        // productNetPrice
        if (unit_price_start && parseFloat(unit_price_start).toString() != 'nan') {
            if (unit_price_start <= 0) { unit_price_start = 0 }
            else { unit_price_start = unit_price_start - 1 }
            filterSecond["productVarinat.productUnitPrice"] = { $gt: unit_price_start }
        }
        if (unit_price_end && parseFloat(unit_price_end).toString() != 'nan') {
            if (unit_price_end <= 0) { unit_price_end = 0 }
            else { unit_price_end = unit_price_end + 1; }
            filterSecond["productVarinat.productUnitPrice"] = { $lt: unit_price_end }
        }
        if (unit_price_start && parseFloat(unit_price_start).toString() != 'nan' && unit_price_end && parseFloat(unit_price_end).toString() != 'nan') {
            filterSecond["productVarinat.productUnitPrice"] = {
                $gt: unit_price_start,
                $lt: unit_price_end
            }
        }
        // End of productNetPrice

        // total_amount
        if (total_amount_start && parseFloat(total_amount_start).toString() != 'nan') {
            if (total_amount_start <= 0) { total_amount_start = 0 }
            else { total_amount_start = total_amount_start - 1 }
            filterSecond.total_amount = { $gt: total_amount_start }
        }
        if (total_amount_end && parseFloat(total_amount_end).toString() != 'nan') {
            if (total_amount_end <= 0) { total_amount_end = 0 }
            else { total_amount_end = total_amount_end + 1; }
            filterSecond.total_amount = { $lt: total_amount_end }
        }
        if (total_amount_start && parseFloat(total_amount_start).toString() != 'nan' && total_amount_end && parseFloat(total_amount_end).toString() != 'nan') {
            filterSecond.total_amount = {
                $gt: total_amount_start,
                $lt: total_amount_end
            }
        }
        // End of total_amount


        // Fetching carts
        const carts = await ALL_MODELS.cartModel.aggregate([
            // Match 
            { $match: filter },
            { $unwind: "$productVariants" },

            // Joining
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariants.productVariantId",
                    foreignField: "_id",
                    as: "productVarinat"
                }
            },
            // Project
            {
                $project: {
                    status: 1, customerId: 1,
                    quantity: "$productVariants.quantity",
                    productVarinat: { $first: "$productVarinat" }
                }
            },
            // Group
            {
                $group: {
                    _id: "$productVarinat._id",
                    total_quantity: {
                        $sum: { $toInt: "$quantity" }
                    },
                    productVarinat: { $first: "$$ROOT.productVarinat" }
                }
            },
            {
                $addFields: {
                    total_amount: {
                        $multiply: ["$total_quantity", { $toDouble: "$productVarinat.productNetPrice" }]
                    },
                    "productVarinat.productUnitPrice": { $toDouble: "$productVarinat.productNetPrice" }
                }
            },
            // Match 
            { $match: filterSecond },
            // Joining
            {
                $lookup: {
                    from: "products",
                    localField: "productVarinat.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            // Joining
            {
                $lookup: {
                    from: "categories",
                    localField: "product.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "productCategories"
                }
            },
            {
                $addFields: {
                    parentCategoryEnglish: {
                        $first: {
                            $map: {
                                input: "$productCategories",
                                as: "productCategories",
                                in: { $first: "$$productCategories.categoryDetails.categoryName" }
                            }
                        }
                    },
                    parentCategoryArabic: {
                        $first: {
                            $map: {
                                input: "$productCategories",
                                as: "productCategories",
                                in: { $last: "$$productCategories.categoryDetails.categoryName" }
                            }
                        }
                    },
                }
            },
            // Joining
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVarinat.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },

            // Project
            {
                $project: {
                    total_quantity: 1, total_amount: 1, productVarinat: 1,
                    parentCategoryEnglish: 1, parentCategoryArabic: 1,
                    seller: { $first: "$seller.nameOfBussinessEnglish" },
                    // product: { $first: "$product.productCategories" },
                    categorieNames: "$productCategories.categoryDetails"
                    /* categorieNames: {
                        $map: {
                            input: "$productCategories",
                            as: "category",
                            in: "$$category.categoryDetails"
                        }
                    } */
                }
            },
            //sorting
            { $sort: sort },
            //search
            { $match: searchFilter },
            //pagination
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

        const cartList = carts.length ? carts[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = carts[0].totalCount[0].count
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            count: cartList.length,
            data: cartList
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of abandoned_cart_report

const abandoned_cart_report_excel = async (req, res, next) => {

    let { start_date, end_date, quantity_start, quantity_end, unit_price_start, unit_price_end, total_amount_start, total_amount_end, } = req.body;
    let { limit, page, search } = req.body;
    //pagination
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

        // Filter
        let filter = {};
        let sort = { _id: -1 };
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 30);

        if (start_date)
            filter.updatedAt = { $gt: new Date(start_date) }
        if (end_date)
            filter.updatedAt = { $lt: new Date(end_date) }
        if (start_date && end_date) {
            filter.updatedAt = {
                $gt: new Date(start_date),
                $lt: new Date(end_date)
            }
        }

        // Going to apply defalult 30 day date filter
        if (!start_date)
            filter.updatedAt = { $gt: defaultDate }


        /**
         * Filtering quantity, unit price and total quantity
         */
        const filterSecond = {
            "productVarinat.productUnitPrice": { $ne: null }
        };
        let searchFilter = {};

        //Search
        if (search) {//&& search.length > 2
            if (parseFloat(search).toString().toLowerCase() != 'nan') {
                searchFilter["$or"] = [
                    { total_amount: parseFloat(search) },
                    { total_quantity: parseFloat(search) }
                ]
            } else {
                let searchReg = new RegExp(search, "i");
                searchFilter["$or"] = [
                    { "productVarinat.productVariantDetails.productVariantName": searchReg },
                    { "seller": searchReg },
                    { "parentCategoryEnglish": searchReg },
                ]
                //console.log(JSON.stringify(searchFilter), searchReg)
            }

        }

        // quantity
        if (quantity_start && parseInt(quantity_start).toString() != 'nan') {
            if (quantity_start <= 0) { quantity_start = 0 }
            else { quantity_start = quantity_start - 1 }
            filterSecond.total_quantity = { $gt: quantity_start }
        }
        if (quantity_end && parseInt(quantity_end).toString() != 'nan') {
            if (quantity_end <= 0) { quantity_end = 0 }
            else { quantity_end = quantity_end + 1; }

            filterSecond.total_quantity = { $lt: quantity_end }
        }
        if (quantity_start && parseInt(quantity_start).toString() != 'nan' && quantity_end && parseInt(quantity_end).toString() != 'nan') {
            filterSecond.total_quantity = {
                $gt: quantity_start,
                $lt: quantity_end
            }
        }
        // End of quantity

        // productNetPrice
        if (unit_price_start && parseFloat(unit_price_start).toString() != 'nan') {
            if (unit_price_start <= 0) { unit_price_start = 0 }
            else { unit_price_start = unit_price_start - 1 }
            filterSecond["productVarinat.productUnitPrice"] = { $gt: unit_price_start }
        }
        if (unit_price_end && parseFloat(unit_price_end).toString() != 'nan') {
            if (unit_price_end <= 0) { unit_price_end = 0 }
            else { unit_price_end = unit_price_end + 1; }
            filterSecond["productVarinat.productUnitPrice"] = { $lt: unit_price_end }
        }
        if (unit_price_start && parseFloat(unit_price_start).toString() != 'nan' && unit_price_end && parseFloat(unit_price_end).toString() != 'nan') {
            filterSecond["productVarinat.productUnitPrice"] = {
                $gt: unit_price_start,
                $lt: unit_price_end
            }
        }
        // End of productNetPrice

        // total_amount
        if (total_amount_start && parseFloat(total_amount_start).toString() != 'nan') {
            if (total_amount_start <= 0) { total_amount_start = 0 }
            else { total_amount_start = total_amount_start - 1 }
            filterSecond.total_amount = { $gt: total_amount_start }
        }
        if (total_amount_end && parseFloat(total_amount_end).toString() != 'nan') {
            if (total_amount_end <= 0) { total_amount_end = 0 }
            else { total_amount_end = total_amount_end + 1; }
            filterSecond.total_amount = { $lt: total_amount_end }
        }
        if (total_amount_start && parseFloat(total_amount_start).toString() != 'nan' && total_amount_end && parseFloat(total_amount_end).toString() != 'nan') {
            filterSecond.total_amount = {
                $gt: total_amount_start,
                $lt: total_amount_end
            }
        }
        // End of total_amount

        // Fetching carts
        const carts = await ALL_MODELS.cartModel.aggregate([
            // Match 
            { $match: filter },
            { $unwind: "$productVariants" },

            // Joining
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariants.productVariantId",
                    foreignField: "_id",
                    as: "productVarinat"
                }
            },
            // Project
            {
                $project: {
                    status: 1, customerId: 1,
                    quantity: "$productVariants.quantity",
                    productVarinat: { $first: "$productVarinat" }
                }
            },
            // Group
            {
                $group: {
                    _id: "$productVarinat._id",
                    total_quantity: {
                        $sum: { $toInt: "$quantity" }
                    },
                    productVarinat: { $first: "$$ROOT.productVarinat" }
                }
            },
            {
                $addFields: {
                    total_amount: {
                        $multiply: ["$total_quantity", { $toDouble: "$productVarinat.productNetPrice" }]
                    },
                    "productVarinat.productUnitPrice": { $toDouble: "$productVarinat.productNetPrice" }
                }
            },
            // Match 
            { $match: filterSecond },
            // Joining
            {
                $lookup: {
                    from: "products",
                    localField: "productVarinat.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            // Joining
            {
                $lookup: {
                    from: "categories",
                    localField: "product.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "productCategories"
                }
            },
            {
                $addFields: {
                    parentCategoryEnglish: {
                        $first: {
                            $map: {
                                input: "$productCategories",
                                as: "productCategories",
                                in: { $first: "$$productCategories.categoryDetails.categoryName" }
                            }
                        }
                    },
                    parentCategoryArabic: {
                        $first: {
                            $map: {
                                input: "$productCategories",
                                as: "productCategories",
                                in: { $last: "$$productCategories.categoryDetails.categoryName" }
                            }
                        }
                    },
                }
            },
            // Joining
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVarinat.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },

            // Project
            {
                $project: {
                    total_quantity: 1, total_amount: 1, productVarinat: 1,
                    parentCategoryEnglish: 1, parentCategoryArabic: 1,
                    seller: { $first: "$seller.nameOfBussinessEnglish" },
                    // product: { $first: "$product.productCategories" },
                    categorieNames: "$productCategories.categoryDetails"
                    /* categorieNames: {
                        $map: {
                            input: "$productCategories",
                            as: "category",
                            in: "$$category.categoryDetails"
                        }
                    } */
                }
            },
            //sorting
            { $sort: sort },
            //search
            { $match: searchFilter },
            //pagination
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

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < carts[0].paginatedResults.length; index++) {
            const element = carts[0].paginatedResults[index];

            excelExportData.push({
                total_quantity: element.total_quantity,
                total_amount: element.total_amount,
                productVarinat: element.productVarinat.productVariantDetails[0].productVariantName,
                seller: element.seller,
                categorieNames: element.categorieNames[0][0].categoryName
            });
        }

        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}abandoned_cart_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Abandoned Cart Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of abandoned_cart_report


module.exports = { abandoned_cart_report, abandoned_cart_report_excel };