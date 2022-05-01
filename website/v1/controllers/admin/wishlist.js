// core modules
const path = require("path");
const mongoose = require("mongoose");
var XLSX = require('xlsx');

const all_models = require("../../../../utilities/allModels");

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

exports.insert_wishlist = async (req, res, next) => {

    const { customerId, productVariantId, quantity = 0, status = 0, deviceIdentifier } = req.body;

    try {
        const productVariant = await all_models.productVariant.findById(productVariantId);

        if (!productVariant) {
            return res.status(422).json({ message: "Invalid product variant id selected" });
        }

        let wishlistData = null;
        if (deviceIdentifier) {
            wishlistData = await all_models.wishlistModel.findOne({ deviceIdentifier });
        } else {
            wishlistData = await all_models.wishlistModel.findOne({ customerId })
        }

        // If wishlist is not available then going to insert one.
        if (!wishlistData) {
            const wishlist = await new all_models.wishlistModel({
                customerId,
                productVariants: { productVariantId, quantity: quantity || 1 },
                status: status,
                deviceIdentifier: deviceIdentifier
            })
            const data = await wishlist.save()

            return res.status(201).json({ message: "Product added to wishlist!", data: data })
        }

        const filterVariantIndex = await wishlistData.productVariants.findIndex(
            variant => variant.productVariantId.toString() === productVariantId.toString()
        );


        if (filterVariantIndex !== -1) {
            const variantQuantity = wishlistData.productVariants[filterVariantIndex].quantity;
            wishlistData.productVariants[filterVariantIndex].quantity = (quantity ? +quantity : variantQuantity + 1);
            wishlistData.status = status;
        } else {
            wishlistData.productVariants.push({ productVariantId, quantity });
            wishlistData.status = status;
        }

        const updatedData = await wishlistData.save();
        return res.status(200).send({ message: "Product added to wishlist!", data: updatedData });

    } catch (error) { return res.status(403).send({ message: error.message }); }



};// End of insert_wishlist method



exports.getSingleWishlist = async (req, res) => {
    try {
        let wishlist = await all_models.wishlistModel.findById(req.params.id)
            .populate(
                [
                    {
                        path: 'productVariants.productVariantId',
                        populate: [
                            {
                                path: 'brandId',
                                select: ["_id", "brandDetails"]
                            },
                            {
                                path: 'sellerId',
                                select: ["_id", "sellerDetails"]
                            }
                        ]
                    },
                    {
                        path: 'customerId',
                        select: ["firstName", "lastName"]
                    }
                ]


            )


        return res.send({ wishlist });
    } catch (error) {
        return res.status(500).send({
            message: "Internal server error :(",
            systemErrorMessage: error.message,
        });
    }
}

exports.delete_wishlist = async (req, res, next) => {

    try {
        const { _id } = req.params;

        const { n: isDeleted } = await all_models.wishlistModel.deleteOne({ _id });

        return res.status(isDeleted ? 200 : 404).json({
            message: isDeleted ? "Wishlist has been removed successfully" : "Resource not found."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of delete_wishlist method

exports.excelWishlist = async (req, res) => {

    let { search, country, startDate, endDate, products, seller } = req.body;

    let filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "customer.fullName": regexp },
            { "sellers.nameOfBussinessEnglish": regexp },
            { "productVariant.productVariantDetails.productVariantName": regexp }
        ];
        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    if (country || startDate || endDate || products || seller) {
        filter["$and"] = [];
    }

    /* if (country) {
        filter["$and"].push({ "customer.customerCountry": { $in: country } });
    } */

    if (products) {
        filter["$and"].push({ "productVariant.productVariantDetails.productVariantName": { $in: products } });
    }
    if (seller) {
        filter["$and"].push({ "sellers.nameOfBussinessEnglish": { $in: seller } });
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

    let wishlist = await all_models.wishlistModel.aggregate([
        { $match: { "productVariants": { $ne: [] } } },
        { $unwind: "$productVariants" },
        {

            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customer"
            }
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariants.productVariantId",
                foreignField: "_id",
                as: "productVariant"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "productVariant.sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        {
            $unwind: {
                "path": "$customer",
                "preserveNullAndEmptyArrays": true
            }
        },
        { $unwind: "$productVariant" },
        { $unwind: "$sellers" },
        {
            $project: {
                _id: 1,
                indexNo: 1,
                status: 1,
                "productVariant._id": 1,
                "productVariant.productVariantDetails": 1,
                createdDate: "$productVariants.createdDate",
                createdAt: "$productVariants.createdAt",
                // createdDate: 1,
                // updatedDate: 1,
                "customer._id": 1,
                "customer.firstName": 1,
                "customer.lastName": 1,
                "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
                "customer.customerCountry": 1,
                "sellers._id": 1,
                "sellers.nameOfBussinessEnglish": 1
            }
        },
        { $sort: { "indexNo": - 1 } },
        { $match: filter }
    ])

    let excelExportData = []

    for (let index = 0; index < wishlist.length; index++) {
        let element = wishlist[index]
        excelExportData.push({
            "WishList#": element.indexNo,
            CustomerName: element.customer.fullName,
            Seller: element.sellers.nameOfBussinessEnglish,
            ProductVariantId: element.productVariant._id,
            EnglishProductVariantName: element.productVariant.productVariantDetails[0].productVariantName,
            ArabicProductVariantName: element.productVariant.productVariantDetails[1].productVariantName,
            CreatedAt: element.createdAt
        })
    }

     var wb = XLSX.utils.book_new(); //new workbook
     var temp = JSON.stringify(excelExportData);
     temp = JSON.parse(temp);
     var ws = XLSX.utils.json_to_sheet(temp);
     let today = new Date();
     var down = `uploads/reports/wishlistExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
  
     XLSX.utils.book_append_sheet(wb, ws, "sheet1"); 
     XLSX.writeFile(wb, down);
 
 
     let newReport = new all_models.reportModel({
         adminId: req.userId,
         ReportName: "wishlistExcel",
         ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
     })
 
     let data = await newReport.save()
 
     return res.send({ message: "Your XL will start downloading now.", data: data })

}

exports.wishlistWithSearch = async (req, res) => {
    let { search, country, startDate, endDate, products, seller } = req.body;
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
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "customer.fullName": regexp },
            { "sellers.nameOfBussinessEnglish": regexp },
            { "productVariant.productVariantDetails.productVariantName": regexp }
        ];
        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    if (country || startDate || endDate || products || seller) {
        filter["$and"] = [];
    }

    /* if (country) {
        filter["$and"].push({ "customer.customerCountry": { $in: country } });
    } */

    if (products) {
        filter["$and"].push({ "productVariant.productVariantDetails.productVariantName": { $in: products } });
    }
    if (seller) {
        filter["$and"].push({ "sellers.nameOfBussinessEnglish": { $in: seller } });
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

    let wishlist = await all_models.wishlistModel.aggregate([
        { $match: { "productVariants": { $ne: [] } } },
        { $unwind: "$productVariants" },
        {

            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customer"
            }
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariants.productVariantId",
                foreignField: "_id",
                as: "productVariant"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "productVariant.sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        {
            $unwind: {
                "path": "$customer",
                "preserveNullAndEmptyArrays": true
            }
        },
        { $unwind: "$productVariant" },
        { $unwind: "$sellers" },
        {
            $project: {
                _id: 1,
                indexNo: "$productVariants.pvIndexNo",
                status: 1,
                "productVariant._id": 1,
                "productVariant.productVariantDetails": 1,
                createdDate: "$productVariants.createdDate",
                createdAt: "$productVariants.createdAt",
                // createdDate: 1,
                // updatedDate: 1,
                "customer._id": 1,
                "customer.firstName": 1,
                "customer.lastName": 1,
                "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
                "customer.customerCountry": 1,
                "sellers._id": 1,
                "sellers.nameOfBussinessEnglish": 1
            }
        },
        { $sort: { "indexNo": - 1 } },
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
    const wishlistData = wishlist.length ? wishlist[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = wishlist[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: wishlistData.length, data: wishlistData });
    // const wishlistData = wishlist.length ? wishlist[0].paginatedResults : [];
    // let totalCount = await all_models.wishlistModel.count();
    // return res.json({ totalCount: totalCount, count: wishlistData.length, data: wishlistData });
}

exports.wishlistFilterProducts = async (req, res) => {
    let { limit, page, search } = req.body;

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
            { "productVariants.productVariantDetails.productVariantName": regexp },

        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    let wishlistProducts = await all_models.wishlistModel.aggregate([

        {
            $group: {
                _id: null, productVariants: { $addToSet: "$productVariants.productVariantId" }
            }
        },
        {
            $addFields: {
                unique: {
                    $reduce: {
                        input: "$productVariants",
                        initialValue: [],
                        in: { $setUnion: ["$$value", "$$this"] }
                    }
                },
            }
        },
        {
            $lookup: {
                from: 'productvariants',
                localField: 'unique',
                foreignField: '_id',
                as: 'productVariants'
            }
        },
        {
            $project: {
                "productVariants._id": 1,
                "productVariants.productVariantDetails.productVariantName": 1,
                "productVariants.productVariantDetails.pv_language": 1
            }
        },
        { $unwind: "$productVariants" },
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
    const wishlistList = wishlistProducts.length ? wishlistProducts[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = wishlistProducts[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: wishlistList.length, data: wishlistList });
}
exports.wishlistFilterProductsSellers = async (req, res) => {
    let wishList = await all_models.wishlistModel.aggregate([
        { $match: { "productVariants": { $ne: [] } } },
        { $unwind: "$productVariants" },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariants.productVariantId",
                foreignField: "_id",
                as: "productVariant"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "productVariant.sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        { $unwind: "$productVariant" },
        { $unwind: "$sellers" },
        {
            $project: {
                "productVariant.productVariantName": { $first: "$productVariant.productVariantDetails.productVariantName" },
                "sellers.nameOfBussinessEnglish": 1
            }
        },
        {
            $group: { _id: null, seller: { $addToSet: "$sellers.nameOfBussinessEnglish" }, product: { $addToSet: "$productVariant.productVariantName" } }
        }
    ])
    return res.send({ data: wishList });
}