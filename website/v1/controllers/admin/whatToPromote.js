let allModels = require("../../../../utilities/allModels")
const mongoose = require("mongoose");

exports.getWhatTopromote = async (req, res, next) => {
    try {
        let whatToPromote = await allModels.whatToPromoteModel.find()
            .select(["_id", "name"])

        return res.send({ data: whatToPromote })
    }
    catch (error) {
        return res.status(403).send({ message: error.message })

    }
}



exports.getAllAdvertisePricing = async (req, res) => {

    try {
        let advertisePricing = await allModels.advertisingPricing
            .find()
        // .select(["advertisingType", "_id"])
        let totalCount = await allModels.advertisingPricing.count();
        return res.send({ count: advertisePricing.length, totalCount, advertisePricing });
    } catch (error) {
        return res.status(403).send({ message: error.message })
    }

}

exports.promoteProductList = async (req, res) => {
    try {
        let product = await allModels.product.find({ "active": true })
            .select(["_id", "productDetails.productName", "active"])

        return res.send({ count: product.length, d: product })

    }
    catch (error) {
        return res.status(403).send({ message: error.message })

    }

}

exports.promoteCategoryList = async (req, res) => {
    if (!req.query.sellerId) {
        return res.status(403).send({ message: "Please enter sellerId" });
    }
    let sellerId = mongoose.Types.ObjectId(req.query.sellerId);
    //console.log(sellerId, req.query.sellerId);

    let category = await allModels.category.aggregate([
        { $match: { active: { $eq: true } } },
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
        { $match: { 'productvariantList.sellerId': sellerId } },
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

exports.promoteBrand = async (req, res) => {
    let brand = await allModels.brand.aggregate([
        { $match: { active: { $eq: true } } },
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

exports.getProductVarintsPromoteAdmin = async (req, res, next) => {
    try {
        if (!req.query.sellerId) {
            return res.status(403).send({ message: "Please enter valid sellerId" });
        }

        let productvariants = await allModels.productVariant.find({
            active: true,
            adminApproval: true,
            sellerId: req.query.sellerId
        })
            .select(["_id", "productVariantDetails.pv_language", "productVariantDetails.productVariantName", "active"])


        return res.send({ count: productvariants.length, d: productvariants })

    }
    catch (error) {
        next(error)
    }
}

// exports.promoteCategoryList = async (req, res) => {
//     try {
//         let category = await allModels.category.find({ "active": true })
//             .select(["_id", "categoryDetails.categoryName", "active"])

//         return res.send({ count: category.length, d: category })

//     }
//     catch (error) {
//         return error

//     }
// }

exports.promoteOffers = async (req, res) => {
    try {
        if (!req.query.sellerId) {
            return res.status(403).send({ message: "Please enter valid sellerId" });
        }
        const today = new Date();
        // today.setHours(0);
        // today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);

        let datetime = convertDateTime(today);

        let offers = await allModels.offerPricing.find({
            active: true,
            sellerId: req.query.sellerId,
            startDate: { $lte: datetime },
            endDate: { $gte: datetime },
        }).select(["_id", "offerName", "active"])

        return res.send({ count: offers.length, d: offers })

    }
    catch (error) {
        return error

    }
}

exports.sellerPromote = async (req, res) => {
    let seller = await allModels.seller.aggregate([
        { $match: { "adminVerified": true } },
        { $addFields: { name: { $toUpper: "$nameOfBussinessEnglish" } } },
        { $sort: { name: 1 } },
        {
            $project: {
                _id: 1,
                nameOfBussinessEnglish: 1,
                adminVerified: 1,
                commissionPercentage: 1,
                deliveryMethod:1
            }
        },
    ]);

    return res.send({ count: seller.length, d: seller })
}

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