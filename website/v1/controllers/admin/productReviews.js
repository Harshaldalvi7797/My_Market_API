const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");
let mongoose = require("mongoose");
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
var XLSX = require('xlsx');

exports.allReviewsExcel = async (req, res) => {
    try {
        const { search, rating } = req.body;

        let filter = {};
        let ratingFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            //  regexp = new RegExp(category, "i");
            filter["$or"] = [
                { "pvs.productVariantDetails.productVariantName": regexp },
                { "description": regexp },
                { "rating": regexp },
                { "customers.firstName": regexp },
            ];
        }

        let review = await ALL_MODELS.productVarientReview.aggregate([

            {
                $lookup: {
                    from: 'productvariants', localField: 'productVariantId',
                    foreignField: '_id', as: 'pvs'
                }
            },
            { $unwind: "$pvs" },

            {
                $lookup: {
                    from: 'sellers', localField: 'pvs.sellerId',
                    foreignField: '_id', as: 'seller'
                }
            },
            { $unwind: "$seller" },
            {
                $lookup: {
                    from: 'customers', localField: 'customerId',
                    foreignField: '_id', as: 'customers'
                }
            },
            { $unwind: "$customers" },
            {
                "$project": {
                    "_id": 1,
                    "productVarientId": 1,
                    "productImages": 1,
                    "active": 1,
                    "description": 1,
                    "rating": 1,
                    "customerId": 1,
                    "pvs.sellerId": 1,
                    "seller.sellerDetails": 1,
                    "seller.nameOfBussinessEnglish": 1,
                    "pvs.productVariantDetails.productVariantName": 1,
                    "pvs._id": 1,
                    "customers.firstName": 1,
                    "customers.lastName": 1,
                    "reportFlag": 1,
                    "reportComment": 1
                }
            },
            { $match: filter },

        ])

        var wb = XLSX.utils.book_new(); //new workbook
        let excelExportData = []

        for (let index = 0; index < review.length; index++) {
            const element = review[index];

            let a = {
                CustomerName: `${element.customers.firstName} ${element.customers.lastName}`,
                Seller: element.seller.nameOfBussinessEnglish,
                ProductVariantName: element.pvs.productVariantDetails[0].productVariantName,
                Review: element.description,
                "#ofStart": element.rating,
                ReportCommentBySeller: element.reportComment,
                Status: (element.active) ? "Active" : "Inactive"
            }

            excelExportData.push(a)
        }
        var temp = JSON.stringify(excelExportData);
        temp = JSON.parse(temp);
        var ws = XLSX.utils.json_to_sheet(temp);
        let today = new Date();
        let folder = `uploads/reports/admin-product-reviews/${req.userId}/`;
        //check if folder exist or not if not then create folder user createdirectory middleware
        await createDirectories(folder);
        var down = `${folder}admin-inventory-Reviews_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
        XLSX.utils.book_append_sheet(wb, ws, "sheet1");
        XLSX.writeFile(wb, down);
        let newReport = new ALL_MODELS.reportModel({
            sellerId: req.userId,
            ReportName: "Admin Product Reviews Report",
            ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
        })

        let data = await newReport.save()
        return res.send({ message: "Your download will begin now.", d: data })

        //   return res.send({ count: review.length, d: excelExportData })
    }
    catch (error) {
        return res.status(500).send({ message: error });

    }

}

exports.allReviews = async (req, res) => {

    try {
        const { search, rating } = req.body;
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
        let ratingFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            //  regexp = new RegExp(category, "i");
            filter["$or"] = [
                { "pvs.productVariantDetails.productVariantName": regexp },
                { "description": regexp },
                { "rating": regexp },
                { "customers.firstName": regexp },
            ];
        }

        let review = await ALL_MODELS.productVarientReview.aggregate([

            {
                $lookup: {
                    from: 'productvariants', localField: 'productVariantId',
                    foreignField: '_id', as: 'pvs'
                }
            },
            {
                $lookup: {
                    from: 'sellers', localField: 'pvs.sellerId',
                    foreignField: '_id', as: 'seller'
                }
            },
            {
                $lookup: {
                    from: 'customers', localField: 'customerId',
                    foreignField: '_id', as: 'customers'
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "productVarientId": 1,
                    "productImages": 1,
                    "active": 1,
                    "description": 1,
                    "rating": 1,
                    "customerId": 1,
                    "pvs.sellerId": 1,
                    "seller.sellerDetails": 1,
                    "seller.nameOfBussinessEnglish": 1,
                    "pvs.productVariantDetails.productVariantName": 1,
                    "pvs._id": 1,
                    "customers.firstName": 1,
                    "customers.lastName": 1,
                    "reportFlag": 1,
                    "reportComment": 1
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
            }
        ])
        // console.log(review)
        let reviewList = review.length ? review[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = review[0].totalCount[0].count
        } catch (err) { }
        return res.send({ totalCount: totalCount, count: reviewList.length, d: reviewList })
    }
    catch (error) {
        return res.status(500).send({ message: error });

    }
}

exports.reviewsProductId = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        const { search, rating } = req.body;
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
        let ratingFilter = {};

        if (search) {
            const regexp = new RegExp(search, "i");
            //  regexp = new RegExp(category, "i");
            filter["$or"] = [
                { "pvs.productVariantDetails.productVariantName": regexp },
                { "description": regexp },
                { "rating": regexp },
                { "customers.firstName": regexp },
            ];
        }

        let review = await ALL_MODELS.productVarientReview.aggregate([
            {
                $unwind: { path: "$likedislike", preserveNullAndEmptyArrays: true }
            },
            {
                $group: {
                    _id: "$_id",
                    likeCount: {
                        $sum: {
                            "$cond": [{
                                $eq: ["$likedislike.isLike", true]
                            }, 1, 0]
                        }
                    },
                    disLikeCount: {
                        $sum: {
                            "$cond": [{
                                $eq: ["$likedislike.isLike", false]
                            }, 1, 0]
                        }
                    },
                    likedislike: {
                        $push: "$likedislike"
                    },
                    productVariantId: {
                        $first: "$productVariantId"
                    },
                    productImages: {
                        $first: "$productImages"
                    },
                    active: {
                        $first: "$active"
                    },
                    description: {
                        $first: "$description"
                    },
                    rating: {
                        $first: "$rating"
                    },
                    description: {
                        $first: "$description"
                    },
                    customerId: {
                        $first: "$customerId"
                    },
                    reportFlag: {
                        $first: "$reportFlag"
                    },
                    reportComment: {
                        $first: "$reportComment"
                    }
                }
            },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: 'productVariantId',
                    foreignField: '_id',
                    as: 'pvs'
                }
            },
            {
                $lookup: {
                    from: 'sellers',
                    localField: 'pvs.sellerId',
                    foreignField: '_id',
                    as: 'seller'
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: "$pvs" } },
            { $unwind: { path: "$customer" } },
            { $unwind: { path: "$seller" } },
            { $match: { "pvs._id": mongoose.Types.ObjectId(req.body.productId) } },

            {
                "$project": {
                    "_id": 1,
                    "productVarientId": 1,
                    "productImages": 1,
                    "active": 1,
                    "description": 1,
                    "rating": 1,
                    "createdAt": 1,
                    "likedislike": 1,
                    "customerId": 1,
                    "pvs.sellerId": 1,
                    "seller.sellerDetails": 1,
                    "pvs.productVariantDetails.productVariantName": 1,
                    "customer.firstName": 1,
                    "customer.lastName": 1,
                    "reportFlag": 1,
                    "reportComment": 1,
                    "likeCount": 1,
                    "disLikeCount": 1

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
            }
        ])
        // console.log(review)
        let reviewList = review.length ? review[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = review[0].totalCount[0].count
        } catch (err) { }
        return res.send({ totalCount: totalCount, count: reviewList.length, d: reviewList })

    }
    catch (error) {

    }

}


exports.deleteReview = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let review = await ALL_MODELS.productVarientReview.findByIdAndRemove({ "_id": req.params.id })

        return res.send({ message: "Review has been deleted." })
    }
    catch (error) {
        return res.status(500).send({
            message: error.message,
        });
    }

}

exports.reviewStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "There was no review found with given information!" })
        }
        let review = await ALL_MODELS.productVarientReview.findByIdAndUpdate(req.body.id);
        if (!review) {
            return res.status(403).send({ message: "There was no review found with given information!" });
        }
        review.active = req.body.active
        review.save()
        return res.send({ message: "Product review status has been updated" });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}