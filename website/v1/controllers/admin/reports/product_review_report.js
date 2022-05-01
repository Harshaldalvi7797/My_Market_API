const path = require("path");

// Local modules
const ALL_MODELS = require(path.join(__dirname, "..", "..", "..", "..", "..", "utilities/allModels"));
var XLSX = require('xlsx');
const { createDirectories } = require('./../../../middlewares/checkCreateFolder');

const product_review_report = async (req, res) => {
    let {
        start_date, end_date, search,
        average_rating_start, average_rating_end, total_rating_start, total_rating_end, limit, page
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
            filter.createdAt = { $gt: defaultDate }
        /**
         * Filtering quantity sold and total quantity
         */
        const filterSecond = {};

        // avgerage rating
        if (average_rating_start) {
            filterSecond.average_rating = { $gte: average_rating_start }
        } else {
            filterSecond.average_rating = { $gte: 0 }
        }
        if (average_rating_end)
            filterSecond.average_rating = { $lte: average_rating_end }
        if (average_rating_start && average_rating_end) {
            filterSecond.average_rating = {
                $gte: average_rating_start,
                $lte: average_rating_end
            }
        }
        // total_rating
        if (total_rating_start) {
            filterSecond.total_reviews = { $gte: total_rating_start }
        }
        else {
            filterSecond.total_reviews = { $gte: 0 }
        }
        if (total_rating_end) { filterSecond.total_reviews = { $lte: total_rating_end } }

        let searchFilter = {}
        if (search) {
            const regexp = new RegExp(search, "i");
            searchFilter["$or"] = [
                { "productVariant.productVariantDetails.productVariantName": regexp },
                { "product.productDetails.productName": regexp },
                { "seller": regexp },
                { "categoriesNames.categoryDetails.categoryName": regexp },
            ]
        }

        // Fetching product viewed
        const productVariantReviews = await ALL_MODELS.productVarientReview.aggregate([
            //    Match
            { $match: filter },
            // Group
            {
                $group: {
                    _id: "$productVariantId",
                    total_reviews: {
                        $sum: { $add: 1 }
                    },
                    total_rating: {
                        $sum: { $add: "$rating" }
                    },
                    average_rating: {
                        $avg: "$rating"
                    }
                },
            },
            // Match
            { $match: filterSecond },
            //Lookups 
            {
                $lookup: {
                    from: "productvariants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productVariant"
                }
            },
            // // project
            {
                $project: {
                    total_reviews: 1, total_rating: 1,
                    average_rating: {
                        $round: ["$average_rating", 1]
                    },
                    productVariant: { $first: "$productVariant" },
                }
            },
            // //Lookups 
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVariant.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            // //Lookups 
            {
                $lookup: {
                    from: "products",
                    localField: "productVariant.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product" } },
            // // project
            {
                $project: {
                    total_reviews: 1, total_rating: 1, average_rating: 1, totalV: 1,
                    productVariant: 1, product: 1,
                    seller: { $first: "$seller.nameOfBussinessEnglish" },
                    productCategories: { $first: "$product.productCategories" }
                }
            },
            // // Lookup
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoriesNames"
                }
            },
            // // project
            {
                $project: {
                    total_reviews: 1, total_rating: 1, productVariant: 1,
                    average_rating: 1, categoriesNames: 1, totalV: 1, product: 1,
                    seller: 1,
                }
            },
            { $match: searchFilter },
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

        let productVarientReviewsList = productVariantReviews.length ? productVariantReviews[0].paginatedResults : [];
        let totalCount = 0;
        try {
            totalCount = productVariantReviews[0].totalCount[0].count;
        } catch (err) { }

        return res.json({
            totalCount: totalCount,
            data: productVarientReviewsList,
            count: productVarientReviewsList.length,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}// End of product_review_report

const product_review_report_excel = async (req, res, next) => {
    let {
        start_date, end_date, search,
        average_rating_start, average_rating_end, total_rating_start, total_rating_end
    } = req.body;

    try {
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
            filter.createdAt = { $gt: defaultDate }
        /**
         * Filtering quantity sold and total quantity
         */
        const filterSecond = {};

        // avgerage rating
        if (average_rating_start) {
            filterSecond.average_rating = { $gte: average_rating_start }
        } else {
            filterSecond.average_rating = { $gte: 0 }
        }
        if (average_rating_end)
            filterSecond.average_rating = { $lte: average_rating_end }
        if (average_rating_start && average_rating_end) {
            filterSecond.average_rating = {
                $gte: average_rating_start,
                $lte: average_rating_end
            }
        }
        // total_rating
        if (total_rating_start) {
            filterSecond.total_reviews = { $gte: total_rating_start }
        }
        else {
            filterSecond.total_reviews = { $gte: 0 }
        }
        if (total_rating_end) { filterSecond.total_reviews = { $lte: total_rating_end } }

        let searchFilter = {}
        if (search) {
            const regexp = new RegExp(search, "i");
            searchFilter["$or"] = [
                { "productVariant.productVariantDetails.productVariantName": regexp },
                { "product.productDetails.productName": regexp },
                { "seller": regexp },
                { "categoriesNames.categoryDetails.categoryName": regexp },
            ]
        }

        // Fetching product viewed
        const productVariantReviews = await ALL_MODELS.productVarientReview.aggregate([
            //    Match
            { $match: filter },
            // Group
            {
                $group: {
                    _id: "$productVariantId",
                    total_reviews: {
                        $sum: { $add: 1 }
                    },
                    total_rating: {
                        $sum: { $add: "$rating" }
                    },
                    average_rating: {
                        $avg: "$rating"
                    },
                },
            },
            // Match
            { $match: filterSecond },
            //Lookups 
            {
                $lookup: {
                    from: "productvariants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productVariant"
                }
            },
            // project
            {
                $project: {
                    total_reviews: 1, total_rating: 1,
                    average_rating: {
                        $round: ["$average_rating", 1]
                    },
                    productVariant: { $first: "$productVariant" },
                }
            },
            //Lookups 
            {
                $lookup: {
                    from: "sellers",
                    localField: "productVariant.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            //Lookups 
            {
                $lookup: {
                    from: "products",
                    localField: "productVariant.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: { path: "$product" } },
            // project
            {
                $project: {
                    total_reviews: 1, total_rating: 1, average_rating: 1,
                    productVariant: 1, product: 1,
                    seller: { $first: "$seller.nameOfBussinessEnglish" },
                    productCategories: { $first: "$product.productCategories" }
                }
            },
            // Lookup
            {
                $lookup: {
                    from: "categories",
                    localField: "productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "categoriesNames"
                }
            },
            // project
            {
                $project: {
                    total_reviews: 1, total_rating: 1, average_rating: 1,
                    productVariant: 1, categoriesNames: 1, totalV: 1, product: 1,
                    seller: 1,
                }
            },
            { $match: searchFilter },
        ]);

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = [];

        for (let index = 0; index < productVariantReviews.length; index++) {
            const element = productVariantReviews[index];

            excelExportData.push({
                SellerName: element.seller,
                Product: element.product.productDetails[0].productName,
                ProductVariant: element.productVariant.productVariantDetails[0].productVariantName,
                CategoriesName: element.categoriesNames[0].categoryDetails.categoryName,
                TotalReviews: element.total_reviews,
                TotalRating: element.total_rating,
                AverageRating: element.average_rating,                
                
            });
        }

        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();

        let folder = `uploads/reports/admin-report/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);

        var down = `${folder}product_review_Export_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`;
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);

        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Product Review Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/"),
        });

        let data = await newReport.save();

        return res.send({
            message: "Your XL will start downloading now.",
            d: data,
        });
    } catch (error) { return res.status(403).send({ message: error.message }); }
}

module.exports = { product_review_report, product_review_report_excel };