const path = require("path");
// Local modules
const ALL_MODELS = require(path.join(__dirname, "..", "..", "..", "..", "..", "utilities/allModels"));
var XLSX = require("xlsx");
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const product_purchase_report = async (req, res, next) => {
    const {
        purchase = "",
        start_date, end_date,
        quantity_sold_start, quantity_sold_end,
        total_amount_start, total_amount_end,
        search
    } = req.body;

    let {
        limit, page,
    } = req.body;

    if (!limit) { limit = 10; }
    if (!page) { page = 1; }

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
				{ "productVariant.productVariantDetails.productVariantName": regexp },
				{ "nameOfBussinessEnglish": regexp },
				{ "categories.categoryDetails.categoryName": regexp },
			];
		}
        // Filter
        const filter = {};
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 7);

        if (start_date)
            filter.createdAt = { $gte: new Date(start_date) }
        if (end_date)
            filter.createdAt = { $lte: new Date(end_date) }
        if (start_date && end_date) {
            filter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        }
        // Going to apply defalult seven day date filter
        if (!start_date)
            filter.createdAt = { $gte: defaultDate }
        /**
         * Filtering quantity sold and total quantity
         */
        const filterSecond = {};
        // quantity sold
        if (quantity_sold_start)
            filterSecond.quantity_sold = { $gte: +quantity_sold_start }
        if (quantity_sold_end)
            filterSecond.quantity_sold = { $lte: +quantity_sold_end }
        if (quantity_sold_start && quantity_sold_end) {
            filterSecond.quantity_sold = {
                $gte: +quantity_sold_start,
                $lte: +quantity_sold_end
            }
        }
        // End of quantity sold

        // total_amount
        if (total_amount_start)
            filterSecond.total_amount = { $gte: +total_amount_start }
        if (total_amount_end)
            filterSecond.total_amount = { $lte: +quantity_sold_end }
        if (total_amount_start && total_amount_end) {
            filterSecond.total_amount = {
                $gte: +total_amount_start,
                $lte: +total_amount_end
            }
        }
        // End of total_amount

        // Sorting
        const sortBy = {};
        if (purchase.toLowerCase() === "most") sortBy.product_sold_count = -1;
        else if (purchase.toLowerCase() === "least") sortBy.product_sold_count = 1;
        else sortBy._id = 1;

        // Fetching order products
        const products = await ALL_MODELS.orderItems.aggregate([
            // Match 
            { $match: filter },
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
                    // orderProduct: { $first: '$$ROOT' },
                }
            },
            // Match 
            { $match: filterSecond },
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
                    // orderProductCreatedAt: "$orderProduct.createdAt", 
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: { $first: "$productVariant" }
                }
            },
            // Joining orderProducts collection with sellers collection
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVariant.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },
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
                    seller: 1,
                    productCategories: { $first: "$product.productCategories" },
                }
            },
            { $unwind: "$productCategories" },
            // Joining orderProducts collection with categories collection
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categories"
                }
            },
            // Projection
            {
                $project: {
                    orderProductCreatedAt: 1,
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: "$productVariant.productVariantDetails",
                    productCategories: 1,
                    seller: "$seller.sellerDetails",
                    nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                    categories: 1,
                }
            },
            { $match: searchFilter },
            // Sorting
            {
                $sort: sortBy
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

        let totalCount = 0;
        try {
            totalCount = products[0].totalCount[0].count;
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            data: products.length ? products[0].paginatedResults : [],
            pageNo: pageNo,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of product_purchase_report

const product_purchase_report_excel = async (req, res, next) => {
    const {
        purchase = "",
        start_date, end_date,
        quantity_sold_start, quantity_sold_end,
        total_amount_start, total_amount_end,
        search
    } = req.body;

    try {
        let searchFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");

			searchFilter["$or"] = [
				{ "productVariant.productVariantDetails.productVariantName": regexp },
				{ "nameOfBussinessEnglish": regexp },
				{ "categories.categoryDetails.categoryName": regexp },
			];
		}
        // Filter
        const filter = {};
        /**
         * Filtering according to date
         */
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() - 7);

        if (start_date)
            filter.createdAt = { $gte: new Date(start_date) }
        if (end_date)
            filter.createdAt = { $lte: new Date(end_date) }
        if (start_date && end_date) {
            filter.createdAt = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        }
        // Going to apply defalult seven day date filter
        if (!start_date)
            filter.createdAt = { $gte: defaultDate }
        /**
         * Filtering quantity sold and total quantity
         */
        const filterSecond = {};
        // quantity sold
        if (quantity_sold_start)
            filterSecond.quantity_sold = { $gte: +quantity_sold_start }
        if (quantity_sold_end)
            filterSecond.quantity_sold = { $lte: +quantity_sold_end }
        if (quantity_sold_start && quantity_sold_end) {
            filterSecond.quantity_sold = {
                $gte: +quantity_sold_start,
                $lte: +quantity_sold_end
            }
        }
        // End of quantity sold

        // total_amount
        if (total_amount_start)
            filterSecond.total_amount = { $gte: +total_amount_start }
        if (total_amount_end)
            filterSecond.total_amount = { $lte: +quantity_sold_end }
        if (total_amount_start && total_amount_end) {
            filterSecond.total_amount = {
                $gte: +total_amount_start,
                $lte: +total_amount_end
            }
        }
        // End of total_amount

        // Sorting
        const sortBy = {};
        if (purchase.toLowerCase() === "most") sortBy.product_sold_count = -1;
        else if (purchase.toLowerCase() === "least") sortBy.product_sold_count = 1;
        else sortBy._id = 1;

        // Fetching order products
        const products = await ALL_MODELS.orderItems.aggregate([
            // Match 
            { $match: filter },
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
                    // orderProduct: { $first: '$$ROOT' },
                }
            },
            // Match 
            { $match: filterSecond },
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
                    // orderProductCreatedAt: "$orderProduct.createdAt", 
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: { $first: "$productVariant" }
                }
            },
            // Joining orderProducts collection with sellers collection
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVariant.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },
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
                    seller: 1,
                    productCategories: { $first: "$product.productCategories" },
                }
            },
            { $unwind: "$productCategories" },
            // Joining orderProducts collection with categories collection
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categories"
                }
            },
            // Projection
            {
                $project: {
                    product_sold_count: 1, quantity_sold: 1, total_amount: 1,
                    productVariant: "$productVariant.productVariantDetails",
                    productCategories: 1,
                    seller: "$seller.sellerDetails",
                    nameOfBussinessEnglish: "$seller.nameOfBussinessEnglish",
                    categories: 1,
                }
            },
            { $match: searchFilter },
            // Sorting
            {
                $sort: sortBy
            },
        ]);

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < products.length; index++) {
            const element = products[index];

            excelExportData.push({
                ProductSoldCount: element.product_sold_count,
                QuantitySold: element.quantity_sold,
                TotalAmount: element.total_amount,
                ProductVariant: element.productVariant[0].productVariantName,
                ProductCategories: element.categories[0].categoryDetails[0].categoryName,
                Seller: element.seller.sellerfName,
                NameOfBussinessEnglish: element.nameOfBussinessEnglish
            });
        }

        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let name = '', fileName = "";
        if (purchase.toLowerCase() === "most") {
            fileName = "most_product_purchase_Export_";
            name = "Most Product Purchase Report";
        }
        else if (purchase.toLowerCase() === "least") {
            fileName = "least_product_purchase_Export_";
            name = "Least Product Purchase Report";
        }

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}${fileName}${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: name,
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}

module.exports = { product_purchase_report, product_purchase_report_excel };