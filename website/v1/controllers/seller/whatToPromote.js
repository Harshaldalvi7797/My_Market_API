let allModels = require("../../../../utilities/allModels")
const mongoose = require("mongoose");
const ALL_MODELS = require("../../../../utilities/allModels");

exports.getWhatTopromote = async (req, res, next) => {
    try {
        let whatToPromote = await allModels.whatToPromoteModel.find({ active: true })
            .select(["_id", "name"])

        return res.send({ data: whatToPromote })
    }
    catch (error) {
        return error

    }
}

exports.getProductVarintsPromote = async (req, res, next) => {
    try {

        let productvariants = await allModels.productVariant.find({ "sellerId": req.userId, "active": true })
            .select(["_id", "productVariantDetails.pv_language", "productVariantDetails.productVariantName", "active"])


        return res.send({ count: productvariants.length, d: productvariants })

    }
    catch (error) {
        next(error)
    }
}

exports.getCategoryPromote = async (req, res) => {

    let category = await ALL_MODELS.seller.aggregate([
        { $match: { "_id": mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: 'productvariants',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'productvariants'
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'productvariants.productId',
                foreignField: '_id',
                as: 'productList'
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'productList.productCategories.categoryLevel1Id',
                foreignField: '_id',
                as: 'categoryList'
            }
        },
        {
            $project: {
                'categoryList._id': 1,
                'categoryList.categoryDetails': 1,
                'categoryList.active': 1,
            }
        }
    ])


    return res.send({ count: category[0].categoryList.length, data: category[0].categoryList })

    // return res.send({ count: category.categoryList.length, d: category.categoryList })
}

exports.getProductPromote = async (req, res) => {
    let products = await ALL_MODELS.seller.aggregate([
        { $match: { "_id": mongoose.Types.ObjectId(req.userId) } },
        {
            $lookup: {
                from: 'productvariants',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'productvariants'
            }
        },
        {
            $lookup: {
                from: 'offerpricings',
                localField: '_id',
                foreignField: 'sellerId',
                as: 'offer'
            }
        },
        {
            $lookup: {
                from: 'offerpricingitems',
                localField: 'offer._id',
                foreignField: 'offerpricingId',
                as: 'offerItems'
            }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'productvariants.productId',
                foreignField: '_id',
                as: 'productList'
            }
        },
        {
            $lookup: {
                from: 'brands',
                localField: 'productvariants.brandId',
                foreignField: '_id',
                as: 'brandList'
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'productList.productCategories.categoryLevel1Id',
                foreignField: '_id',
                as: 'categoryList'
            }
        },
        {
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

    // console.log("product", products[0].productvariants)
    if (products[0].productvariants.length > 0) {
        let statusCheck = products[0].productvariants.filter(f => {
            return f.active == true;
        });
        let productList = [];
        for (let index = 0; index < statusCheck.length; index++) {
            const element = statusCheck[index];
            let productCheck = products[0].productList.filter(f => {
                return f._id.toString() == element.productId.toString() && f.active == true;
            });
            if (productCheck.length > 0) {
                productList.push(productCheck[0])
            }
        }
        // console.log(productList)

        productList = productList.filter((li, idx, self) =>
            self.map(itm => itm['_id']).indexOf(li['_id']) === idx);
        products[0].productList = productList;
    }

    return res.send({ count: products[0].productList.length, data: products[0].productList })

}

exports.getBrandPromote = async (req, res) => {
    let products = await allModels.productVariant.find({ "sellerId": req.userId, "active": true })
        .select(["brandId"])
        .populate({
            path: "brandId",
            select: ["_id", "brandDetails"]

        });



    return res.send({ count: products.length, d: products })
}

exports.newArrivalProductvarintsPromote = async (req, res, next) => {
    try {

        let productVariant = await allModels.productVariant.find({
            "sellerId": req.userId, "active": true
        }).
            sort([['createdAt', '-1']])
            .select(['productVariantDetails', '_id', 'sellerId'])
            .limit()
        //console.log(productVariant)
        if (productVariant.length == 0) {
            return res.send({ count: 0, d: productVariant });
        }



        //console.log(temp)

        let RESPONSE_DATA = productVariant.filter(a => {
            return a['sellerId'] != null;
        });
        // console.log(RESPONSE_DATA)
        return res.send({ count: RESPONSE_DATA.length, d: RESPONSE_DATA })

    }
    catch (error) {
        return error
    }
}

const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);

    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}

exports.offersPromote = async (req, res) => {
    try {
        const today = new Date();
        // today.setHours(0);
        // today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);

        let datetime = convertDateTime(today);
        // console.log(datetime)
        let offers = await allModels.offerPricing.find({
            sellerId: req.userId, active: true,
            startDate: { $lte: datetime },
            endDate: { $gte: datetime },
        })
            .select(["_id", "offerName", "active"])
        return res.send({ d: offers })
    }
    catch (error) {
        return res.status(403).send({ message: error.message })
    }
}
