let allModels = require("../../../../utilities/allModels")
const mongoose = require("mongoose");

exports.getCategoryOfSeller = async (req, res) => {
    let category = await allModels.seller.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: 'productvariants',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'productvariants'
            }
        }, {
            $lookup: {
                from: 'offerpricings',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'offer'
            }
        }, {
            $lookup: {
                from: 'offerpricingitems',
                localField: 'offer._id',
                foreignField: 'offerpricingId',
                as: 'offerItems'
            }
        }, {
            $lookup: {
                from: 'products',
                localField: 'productvariants.productId',
                foreignField: '_id',
                as: 'productList'
            }
        }, {
            $lookup: {
                from: 'brands',
                localField: 'productvariants.brandId',
                foreignField: '_id',
                as: 'brandList'
            }
        }, {
            $lookup: {
                from: 'categories',
                localField: 'productList.productCategories.categoryLevel1Id',
                foreignField: '_id',
                as: 'categoryList'
            }
        }, {
            $project: {
                sellerDetails: 1,
                productvariants: 1,
                offer: 1,
                offerItems: 1,
                'productList._id': 1,
                'productList.productDetails': 1,
                'productList.brandId': 1,
                'productList.active': 1,
                'brandList._id': 1,
                'brandList.brandDetails': 1,
                'categoryList._id': 1,
                'categoryList.active': 1,
                'categoryList.categoryDetails': 1
            }
        }
    ])
    
    return res.send({ count: category[0].categoryList.length, d: category[0].categoryList })

}

exports.getBrandOfSeller = async (req, res) => {

    let sellerBrands = await allModels.seller.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: 'productvariants',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'productvariants'
            }
        }, {
            $lookup: {
                from: 'offerpricings',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'offer'
            }
        }, {
            $lookup: {
                from: 'offerpricingitems',
                localField: 'offer._id',
                foreignField: 'offerpricingId',
                as: 'offerItems'
            }
        }, {
            $lookup: {
                from: 'products',
                localField: 'productvariants.productId',
                foreignField: '_id',
                as: 'productList'
            }
        }, {
            $lookup: {
                from: 'brands',
                localField: 'productvariants.brandId',
                foreignField: '_id',
                as: 'brandList'
            }
        }, {
            $lookup: {
                from: 'categories',
                localField: 'productList.productCategories.categoryLevel1Id',
                foreignField: '_id',
                as: 'categoryList'
            }
        }, {
            $project: {
                sellerDetails: 1,
                productvariants: 1,
                offer: 1,
                offerItems: 1,
                'productList._id': 1,
                'productList.productDetails': 1,
                'productList.brandId': 1,
                'productList.active': 1,
                'brandList._id': 1,
                'brandList.brandDetails': 1,
                'categoryList._id': 1,
                'categoryList.active': 1,
                'categoryList.categoryDetails': 1
            }
        }
    ])
    return res.send({ count: sellerBrands[0].brandList.length, d: sellerBrands[0].brandList })




}