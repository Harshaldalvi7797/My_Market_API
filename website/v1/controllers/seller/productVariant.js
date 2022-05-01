let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
var XLSX = require('xlsx');
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
const path = require("path");
const uuidv4 = require("uuid").v4;
let upload = require("./../../middlewares/fileUpload");
let mongoose = require("mongoose");
const { product } = require("../../../../app/utilities/allModels");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.addProductvariant = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let reqData = req.body;

    try {
        let product = await allModels.product.findOne({
            _id: reqData.productId
        }).select(['-__v', '-createdAt', '-updatedAt'])
            .populate([
                { path: "brandId", select: ["brandDetails"] }
            ]);

        if (!product) { return res.status(403).send({ message: "Invalid product id selected" }); }


        //add product variant record
        let newProductVariant = new allModels.productVariant({
            currency: "BHD",
            productId: reqData.productId,
            brandId: product['brandId'],
            sellerId: req.userId,

            productSKU: reqData.productSKU,
            productVariantDetails: reqData.productVariantDetails,

            // productVariantDetails:JSON.parse([...reqData.productVariantDetails,...pvId.uuidv4()]),
            // productVariantDetails: JSON.parse(reqData.productVariantDetails),
            //array of object

            productCurrency: reqData.productCurrency,
            productGrossPrice: reqData.productGrossPrice,
            productNetPrice: reqData.productNetPrice,
            productTaxPercentage: reqData.productTaxPercentage,
            productTaxName: reqData.productTaxName,
            productTaxPrice: reqData.productTaxPrice,

            orderQuantityMax: reqData.orderQuantityMax,
            orderQuantityMin: reqData.orderQuantityMin,

            inventoryQuantity: reqData.inventoryQuantity,
            inventoryReOrderLevel: reqData.inventoryReOrderLevel,
            inventoryReOrderQuantity: reqData.inventoryReOrderQuantity,

            shipmentWidth: reqData.shipmentWidth,
            shipmentLength: reqData.shipmentLength,
            shipmentHeight: reqData.shipmentHeight,
            shipmentWeight: reqData.shipmentWeight,

            subscription: reqData.subscription,
            subscriptionPrice: reqData.subscriptionPrice,
            subscriptionPriceWithoutTax: reqData.subscriptionPriceWithoutTax,
            subscriptionTaxAmount: reqData.subscriptionTaxAmount,

            sale: reqData.sale,
            saleTaxAmount: reqData.saleTaxAmount,
            salepricewithoutTax: reqData.salepricewithoutTax,
            salePrice: reqData.salePrice,
            salePricePercentage: reqData.salePricePercentage,

            savingPercentage: reqData.savingPercentage.toString(),

            tags: reqData.tags,
            codConveniencePrice: reqData.codConveniencePrice,
            domesticShippingPrice: reqData.domesticShippingPrice,
            internationalShippingPrice: reqData.internationalShippingPrice,
            additionalCod: reqData.additionalCod

        });

        //console.log(newProductVariant)
        /**----------------------------------------- */
        // let uploadLocation = newProductVariant['productId'] + `/${newProductVariant['_id']}`;
        //console.log(uploadLocation);
        //console.log(newProductVariant);
        /* try {
            await upload.fileUpload(req, next, "productVariantImages", uploadLocation);
            newProductVariant['productVariantImages'] = req.filPath;
        } catch (error) {
            console.log(error);
        } */


        let data = await newProductVariant.save()
        res.send({ message: "Product has been added. Please proceed to add Images and specification. Admin Approval can take upto 72 hours.", d: data });

        try {
            /*/ Sending Notication /*/
            //Notification to Admin
            data.sellername = req.seller.nameOfBussinessEnglish
            data.brandname = product.brandId.brandDetails[0].brandName
            let adminId = "61c961934280680ee8782e76"
            await sendNotification(req, req.userId, adminId, '44', data, 'product variant', data._id)

            //Notification to Followers
            var followers = await allModels.customer_seller_follow.find({
                sellerId: req.userId
            })
                .populate([
                    { path: "sellerId", select: ["nameOfBussinessEnglish", "sellerDetails"] },
                    { path: "customerId", select: ["firstName", "lastName", "emailAddress", "mobilePhone"] }
                ]);

            for (let follower of followers) {
                data.customername = follower.customerId.firstname
                data.sellername = follower.sellerId.nameOfBussinessEnglish
                data.brandname = product.brandId.brandDetails[0].brandName
                await sendNotification(req, req.userId, follower.customerId._id, '14', data, 'product variant', data._id)
            }
            //End Sending Notification
        } catch (error) {
            console.log(error.message);
        }
    }
    catch (error) {
        console.log(error)
        return res.status(500).send({ message: error });
    }

}

exports.updateProductVariant = async (req, res, next) => {
    const valid = mongoose.Types.ObjectId.isValid(req.params.id);

    if (!valid)
        return res.status(402).send({ message: "Invalid product variant id" });

    // Product variant id
    const _id = mongoose.Types.ObjectId(req.params.id)

    try {
        const productVariant = await allModels.productVariant.findById({ "_id": req.params.id })
            .select(['-__v', '-createdAt', '-updatedAt']);
        //console.log(productVariant)

        if (!productVariant)
            return res.status(404).send({ message: "Invalid Product variant Id" });

        //console.log(productVariant)
        let product = await allModels.product.findOne({
            _id: req.body.productId
        });

        if (!product) { return res.status(403).send({ message: "Invalid product id selected" }); }


        //Array Update
        let productVariantDetails = {}
        productVariantDetails = req.body.productVariantDetails ? req.body.productVariantDetails : productVariant.productVariantDetails

        productVariant.productVariantDetails = productVariantDetails
        productVariant.productSKU = req.body.productSKU || productVariant.productSKU
        productVariant.tags = req.body.tags || productVariant.tags

        productVariant.productCurrency = req.body.productCurrency || productVariant.productCurrency
        productVariant.productGrossPrice = req.body.productGrossPrice || productVariant.productGrossPrice
        productVariant.productNetPrice = req.body.productNetPrice || productVariant.productNetPrice
        //if net price is update 

        //offer check or price change save

        //coupon check or price change save if possible
        productVariant.productTaxPercentage = req.body.productTaxPercentage || productVariant.productTaxPercentage
        productVariant.productTaxPrice = req.body.productTaxPrice || productVariant.productTaxPrice
        productVariant.productTaxName = req.body.productTaxName || productVariant.productTaxName

        productVariant.orderQuantityMax = req.body.orderQuantityMax || productVariant.orderQuantityMax
        productVariant.orderQuantityMin = req.body.orderQuantityMin || productVariant.orderQuantityMin

        productVariant.inventoryQuantity = req.body.inventoryQuantity || productVariant.inventoryQuantity
        productVariant.inventoryReOrderLevel = req.body.inventoryReOrderLevel || productVariant.inventoryReOrderLevel
        productVariant.inventoryReOrderQuantity = req.body.inventoryReOrderQuantity || productVariant.inventoryReOrderQuantity

        productVariant.shipmentWidth = req.body.shipmentWidth || productVariant.shipmentWidth
        productVariant.shipmentLength = req.body.shipmentLength || productVariant.shipmentLength
        productVariant.shipmentHeight = req.body.shipmentHeight || productVariant.shipmentHeight
        productVariant.shipmentWeight = req.body.shipmentWeight || productVariant.shipmentWeight

        productVariant.subscription = (req.body.subscription != undefined) ? req.body.subscription : productVariant.subscription;
        productVariant.subscriptionPrice = req.body.subscriptionPrice || productVariant.subscriptionPrice
        productVariant.subscriptionPriceWithoutTax = req.body.subscriptionPriceWithoutTax || productVariant.subscriptionPriceWithoutTax
        productVariant.subscriptionTaxAmount = req.body.subscriptionTaxAmount || productVariant.subscriptionTaxAmount

        productVariant.additionalCod = req.body.additionalCod || productVariant.additionalCod
        productVariant.sale = req.body.sale || productVariant.sale
        productVariant.saleTaxAmount = req.body.saleTaxAmount || productVariant.saleTaxAmount;
        productVariant.salepricewithoutTax = req.body.salepricewithoutTax || productVariant.salepricewithoutTax;
        productVariant.salePrice = req.body.salePrice || productVariant.salePrice;
        productVariant.salePricePercentage = req.body.salePricePercentage || productVariant.salePricePercentage;

        productVariant.savingPercentage = req.body.savingPercentage.toString() || productVariant.savingPercentage.toString();
        productVariant.active = (req.body.active != undefined) ? req.body.active : productVariant.active;

        productVariant.domesticShippingPrice = req.body.domesticShippingPrice.toString() || productVariant.domesticShippingPrice;
        productVariant.internationalShippingPrice = req.body.internationalShippingPrice.toString() || productVariant.internationalShippingPrice;


        await productVariant.save();
        pvUpdateOffer(productVariant._id, req.body.productNetPrice);
        pvUpdateCoupon(productVariant._id, req.body.productNetPrice);

        return res.send({ message: "Product variant details has been updated.", domesticShippingPrice: req.body.domesticShippingPrice });



    } catch (error) {
        return res.status(500).send({ message: error.stack });
    }

}// End of updateProductVariant method

const pvUpdateOffer = (productVariantId, netPrice) => {

}

const pvUpdateCoupon = (productVariantId, netPrice) => {

}

exports.fetchproductVariant = async (req, res) => {
    let data = await allModels.productVariant.find()
        .populate([
            {
                path: 'productId',
                select: ["_id", "productDetails", "brandId", "productCategories"],
                populate: [
                    {
                        path: 'brandId',
                        select: ["_id", "brandDetails"]
                    },
                    {
                        path: 'productCategories.categoryId',
                        select: ["_id", "categoryDetails"]
                    }
                ]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish"]
            },
        ]).select(["-__v", '-createdAt', '-updatedAt'])
    //.select(['-__v', '-createdAt', '-updatedAt']);
    //console.log(data)

    return res.send({ d: data });
}


exports.fetchproductVariantByProductId = async (req, res, next) => {

    try {
        const { search } = req.body;

        const filter = {};
        if (search) {
            const regexp = new RegExp(search, "i");
            filter["$or"] = [
                { "productVariantDetails.productVariantName": regexp },
                { "productSKU": regexp },
                { "productGrossPrice": regexp },
                { "productNetPrice": regexp }
            ];

        }



        let products = await allModels.productVariant.aggregate([

            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
            { $match: { "productId": mongoose.Types.ObjectId(req.body.productId) } },

            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "products",

                },

            },

            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryId",
                    foreignField: "_id",
                    as: "categories",

                },
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands",

                },
            },
            { $match: filter },

            // {
            //     $project: {
            //      sellerId:1,productId:1,
            //         productDetails: {$first: {$first: "$products.productDetails"}},
            //     },
            // },

            {
                $facet: {
                    paginatedResults: [
                        {
                            $skip:
                                !req.query.skip || req.query.skip == 0
                                    ? 0
                                    : parseInt(req.query.skip),
                        },
                        {
                            $limit:
                                !req.query.limit || req.query.limit == 0
                                    ? 5
                                    : parseInt(req.query.limit),
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

        const productList = products.length ? products[0].paginatedResults : [];
        return res.send({ count: productList.length, d: productList })
    }
    catch (error) {
        next(error)
    }

}

exports.updatePhotoOrder = async (req, res) => {
    var valid = mongoose.Types.ObjectId.isValid(req.params.id);

    if (!valid) {
        return res.status(402).send({ message: "Invalid product  id" });
    }

    try {
        let productVariant = await allModels.productVariant.findById({
            _id: req.params.id,
            sellerId: req.userId
        })

        if (!productVariant) {
            return res.status(404).send({ message: "Invalid Product  Id" });
        }

        let variantImages = [];
        if (req.body.data.photoOrder) {
            await productVariant.productVariantImages.forEach((el, i) => {
                let row = { photoOrder: "", path: "" };
                try {
                    row.path = req.body.data.path[i];
                    //console.log(row.path);
                } catch (error) { }
                try {
                    row.photoOrder = req.body.data.photoOrder[i];
                    //console.log(row.photoOrder);
                } catch (error) { }
                variantImages.push(row);
            });
        }
        productVariant.productVariantImages = variantImages;

        variantImages.forEach((el, i) => {
            if (el.path == null) {
                productVariant.productVariantImages.splice(i, 1);
            }
        });

        await productVariant.save();

        return res.send({ message: "productVariant images has been updated." })

    } catch (error) {
        return res.status(402).send({ message: JSON.stringify(error.message) });
    }
}

exports.updateProductVariantPhoto = async (req, res, next) => {
    let productVariant = await allModels.productVariant.findById({
        _id: req.params.id,
        sellerId: req.userId
    });
    //console.log(productVariant._id)

    if (!productVariant) {
        return res.status(404).send({ message: "Invalid Product variant Id" });
    }
    if (!req.body.photoOrder) {
        return res.status(401).json({ error: "Please enter photoOrder" });
    }
    let photoOrder = null;
    try {
        photoOrder = (req.body.photoOrder);

    } catch (error) {
        return res.status(403).send({ message: "photoOrder has invalid format" });
    }
    try {
        let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}`
        await upload.fileUpload(req, next, "productVariantImages", uploadLocation);

        let filPath = req.filPath;
        let productImages = productVariant['productVariantImages'];
        if (productImages.length == 0) {
            productVariant['productVariantImages'] = filPath;
            await productVariant.save()
        }
        else if (productImages.length > 0) {
            let productVariantUpdate = await allModels.productVariant.findById({
                _id: productVariant._id,
                sellerId: req.userId
            });


            for (let index = 0; index < filPath.length; index++) {
                const ele = filPath[index];
                let a = await productImages.findIndex(x => x.photoOrder.toString() === ele.photoOrder.toString());
                // console.log(a);

                if (a != -1) {
                    // console.log(productVariantUpdate["productVariantImages"][a], ele)                    
                    productImages[a].path = ele.path;
                } else {
                    productImages.push({
                        active: true,
                        path: ele.path,
                        photoOrder: ele.photoOrder
                    });
                }
            }
            productVariantUpdate["productVariantImages"] = productImages;
            await productVariantUpdate.save();
        }
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }


    let productVariantData = await allModels.productVariant.findOne({
        _id: req.params.id
    }).select(["productVariantImages"])
    return res.send({ message: "Product images have been uploaded", d: productVariantData });

}

exports.updateProductimageRemove = async (req, res, next) => {


    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    if (!req.body.photoOrder) {
        return res.status(403).send({ message: "Please enter photoOrder" })
    }
    let productVariant = await allModels.productVariant.findById({
        _id: req.params.id,
        sellerId: req.userId
    }).select(["productVariantImages"])
    // console.log(productVariant.productVariantImages)

    if (!productVariant) {
        return res.status(404).send({ message: "Invalid Product variant Id" });
    }

    let pvImages = productVariant['productVariantImages'];
    if (pvImages.length > 0) {
        let a = await pvImages.findIndex(x => x.photoOrder.toString() === req.body.photoOrder.toString());
        if (a != -1) {
            pvImages.splice(a, 1);
            let pv = await allModels.productVariant.findById({
                _id: req.params.id,
                sellerId: req.userId
            })

            for (let index = 0; index < pvImages.length; index++) {
                pvImages[index].photoOrder = (index + 1);
            }

            pv['productVariantImages'] = pvImages;
            await pv.save()
            return res.send({ message: "Product image removed successfully" });
        } else {
            return res.status(403).send({ message: "can't remove image, invalid image selected" })
        }
    } else {
        return res.status(403).send({ message: "No images found for selected product variant" })
    }

}

exports.getProductVariants = async (req, res) => {

    let productVariant = await allModels.productVariant.find({
        sellerId: req.userId
    })
        .populate({
            path: 'productId',
            select: ["_id", "productDetails", "brandId", "productCategories", "active"],
            populate: [
                {
                    path: 'brandId',
                    select: ["_id", "brandDetails"]
                },
                {
                    path: 'productCategories.categoryId',
                    select: ["_id", "categoryDetails"]
                }
            ]
        })
        .select(["_id", "productId"]).lean();


    let productList = productVariant.filter((li, idx, self) => self.map(itm =>
        itm['productId']).indexOf(li['productId']) === idx
    );
    //console.log(productList);


    for (let i = 0; i < productList.length; i++) {
        productList[i]['productVariants'] = await allModels.productVariant.find({
            productId: productList[i]['productId'],
            sellerId: req.userId

        });
        // return res.send({ count: product.length, data: product })
    }



    return res.send({ count: productList.length, data: productList })
}

exports.updateStatus = async (req, res) => {
    try {
        let productvariant = await allModels.productVariant.findByIdAndUpdate(req.params.id);
        if (!productvariant) {
            return res.status(403).send({ message: "invalid id" });
        }
        productvariant.active = req.body.active
        productvariant.save()
        return res.send({ message: "Product variant status updated successfully" });
    }
    catch (error) {
        return res.status(500).send({
            message: "Internal server error :(",
            systemErrorMessage: error.message,
        });
    }
}

exports.productVariantSubscriptionDvertisementCheckCheck = async (req, res) => {

    // endDate > today
    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    let datetime = convertDateTime(today);

    // console.log("datetime", datetime)
    let filter = {
        '$and': [

            // { "toDate": { $gte: datetime } },

            { "status": "Active" },

        ]
    }
    let subscriptionCheck = await allModels.subscribeModel.aggregate([

        { $match: { "productVariantId": mongoose.Types.ObjectId(req.body.productVariantId) } },
        { $match: filter }
    ])

    let adFilter = {
        '$and': [

            { "endDateTime1": { $gte: datetime } },
            { "adminApproval": true },
            { "active": true },



        ]
    }

    let advertiseProduct = await allModels.advertisementCampaign.aggregate([
        { $match: { "whatToPromote.id": mongoose.Types.ObjectId(req.body.productVariantId) } },
        { $match: adFilter }
    ])

    let RESPONSE = { subscription: subscriptionCheck, advertisement: advertiseProduct }
    return res.send({ data: RESPONSE })

}

exports.getcategorySpecifications = async (req, res) => {
    let productvariant = await allModels.productVariant.aggregate([
        {
            $match:
            {
                "_id": mongoose.Types.ObjectId(req.params.id)
            }
        },
        {
            $lookup:
            {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "products"

            }
        },
        {
            $project: {
                productCategories: 1,
                productCategories: { $first: "$products.productCategories" }
            }
        },
        {
            $lookup:
            {
                from: "categories",
                localField: "productCategories.categoryId",
                foreignField: "_id",
                as: "category"

            }
        },
        {
            $project:
            {

                categorySpecification: { $first: "$category.categorySpecification" }
            }
        }



    ])

    // console.log(typeof (productvariant))
    return res.send(productvariant)




}

exports.singleProductvariant = async (req, res) => {
    let productVariant = null;
    //try {
    productVariant = await allModels.productVariant.findById(req.params.id)
        .select(['-__v', '-createdAt', '-updatedAt'])
        .populate([
            {
                path: 'productId',
                select: ["_id", "productDetails"]
            },
            {
                path: 'brandId',
                select: ["_id", "brandDetails"]
            },
            {
                path: 'sellerId',
                select: ['_id', 'nameOfBussinessEnglish', 'commissionPercentage']
            }
        ])
    if (!productVariant) {
        // allModels.log.writeLog(req, "Invalid product Id");
        return res.status(404).send({ message: "Invalid product Id" });
    }

    return res.send({ d: productVariant })


}

exports.addProuctSpecifications = async (req, res) => {

    let productvariant = await allModels.productVariant.findById({ "_id": req.params.id }).select(["productId"])

    //  console.log("productId",productvariant.productId)
    let product = await allModels.product.findById({ "_id": productvariant.productId })
    let productSpecifications = {}
    productSpecifications = (req.body.productSpecifications) ? (req.body.productSpecifications) : product.productSpecifications

    product.productSpecifications = productSpecifications

    product.save()
    // product.productSpecifications

    return res.send({ message: "product specification added successfully", d: product })

}

exports.getCategorySpecifications = async (req, res) => {
    let product = await allModels.product.findById({ "_id": req.params.id })
        .select(["productCategories"])


    for (let index = 0; index < product.productCategories.length; index++) {
        const element = product.productCategories[index];
        // console.log(element)

        let categoryLevel3 = await allModels.category.findOne({ "_id": element.categoryLevel3Id })
            .select(["_id", "categorySpecifications"])

        if (categoryLevel3 != null) {
            // console.log("categoryLevel3", categoryLevel3)
            return res.send({ data: categoryLevel3 })
        }


        let categoryLevel2 = await allModels.category.findOne({ "_id": element.categoryLevel2Id })
            .select(["_id", "categorySpecifications"])

        if (categoryLevel2 != null) {
            return res.send({ data: categoryLevel2 })
        }
        let categoryLevel1 = await allModels.category.findOne({ "_id": element.categoryLevel1Id })
            .select(["_id", "categorySpecifications"])

        if (categoryLevel1 != null) {
            return res.send({ data: categoryLevel1 })
        }


    }

    // return res.send({ product })

}

exports.addvarintSpecs = async (req, res) => {
    let productVarint = await allModels.productVariant.findById({ "_id": req.body.productvarintId })
    // console.log(req.body.productVariantSpecifications)
    if (!productVarint) {
        return res.send({ message: "No Found" })
    }
    productVarint.productVariantSpecifications = req.body.productVariantSpecifications ? req.body.productVariantSpecifications : productVarint.productVariantSpecifications

    let data = await productVarint.save()
    return res.send({ message: "Specifications have been added.", data: data })
}

exports.getSellersProductVariantsWithSearch = async (req, res) => {
    try {
        let { search, category, brands, status, subscription, startDate, endDate } = req.body;
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

        const filter = {};
        if (search) {
            const regexp = new RegExp(search, "i");
            //  regexp = new RegExp(category, "i");
            filter["$or"] = [
                { "productNetPrice": regexp },
                { "productVariantDetails.productVariantName": regexp },
                { "productSKU": regexp },
                { "parentcategories.categoryDetails.categoryName": regexp },
                { "products.productDetails.productName": regexp },
                { "brands.brandDetails.brandName": regexp }
            ];
            if (parseInt(search) != NaN) {
                filter["$or"].push({ "indexNo": parseInt(search) })
            }
        }

        if (category || brands || status || subscription || startDate || endDate) {
            filter["$and"] = [];
        }
        if (category) {
            filter["$and"].push({ "parentcategories.categoryDetails.categoryName": { $in: category } });
        }
        if (brands) {
            filter["$and"].push({ "brands.brandDetails.brandName": { $in: brands } });
        }
        if (status) {
            filter["$and"].push({ "active": { $in: status } });
        }
        if (subscription) {
            filter["$and"].push({ "subscription": { $in: subscription } });
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

        // console.log(filter)

        let productVarints = await allModels.productVariant.aggregate([
            { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },
            {
                $lookup: {
                    from: 'products', localField: 'productId',
                    foreignField: '_id', as: 'products'
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "products.productCategories.categoryLevel1Id",
                    foreignField: "_id",
                    as: "parentcategories",

                },
            },
            {
                $lookup: {
                    from: "brands",
                    localField: "brandId",
                    foreignField: "_id",
                    as: "brands",

                },
            },
            { $match: filter },
            { $sort: { "indexNo": - 1 } },
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
        //console.log("filter", filter)
        const productVarintsList = productVarints.length ? productVarints[0].paginatedResults : [];

        let totalCount = 0
        try {
            totalCount = productVarints[0].totalCount[0].count
        } catch (err) { }
        return res.send({ totalCount: totalCount, count: productVarintsList.length, data: productVarintsList });
        // return res.send({ totalCount: productVarints[0].totalCount[0].count, data: productVarintList })


    }
    catch (error) {
        // return error
        return res.status(403).send({ message: error.message });
    }

}

exports.promotionalVideo = async (req, res, next) => {
    try {
        productVariant = await allModels.productVariant.findOne({ _id: req.body.productvariantId, sellerId: req.userId });
        if (!productVariant) {
            return res.status(404).send({ message: "There was no productVariant found with given information!" });
        }
        if (req.files) {
            let uploadLocation = productVariant['productId'] + `/${productVariant['_id']}/promotionVideo`
            let fileUploadResponse = await upload.sellerFileUpload(req, 'promotionVideo', uploadLocation, 'mp4');

            if (fileUploadResponse != false) {
                productVariant['promotionVideo'] = req.filPath[0];
                await productVariant.save();
                return res.send({ message: "Video has been uploaded." });
            } else {
                return res.status(403).send({ message: "Please upload valid .mp4 file" });
            }
        } else {
            return res.status(403).send({ message: "Please upload video file" });
        }
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.deletePromotionVideo = async (req, res) => {

    let productVariant = await allModels.productVariant.findOne({ "_id": req.body.productVariantId, "sellerId": req.userId })

    if (!productVariant) {
        return res.send({ message: "There was no productVariant found with given information!" })
    }
    if (req.body.promotionVideo == 0) {
        productVariant.promotionVideo = null
    }
    let data = await productVariant.save()

    return res.send({ message: "video  delete successfully", data: data });
}

exports.multiStatusUpdate = async (req, res) => {
    let { productVariantId } = req.body;
    let products = null;
    if (typeof productVariantId == "string" && productVariantId.toLowerCase() == "all") {
        products = await allModels.productVariant.find({ "sellerId": req.userId })
            .select(["_id"])
    } else if (typeof productVariantId == "object") {
        products = await allModels.productVariant.find({ "_id": req.body.productVariantId })
            .select(["_id"])
    }

    for (let index = 0; index < products.length; index++) {
        const element = products[index];
        let update = { active: req.body.active }
        let updateStatus = await allModels.productVariant.updateMany({ "_id": element._id }, { $set: update })
    }

    return res.send({ message: "Status has been updated." });
}

exports.inventoryQuantityUpdate = async (req, res) => {
    let update = { inventoryQuantity: req.body.inventoryQuantity }

    let updateStatus = await allModels.productVariant.findByIdAndUpdate({ "_id": req.body.productVariantId }, { $set: update })

    //Notification Work
    if (updateStatus.inventoryQuantity == '0') {
        //Sending Notification
        let NotifyMeUsers = await allModels.notifyModel.find({ productVariantId: req.body.productVariantId, status: 0 })
            .populate([
                { path: "customerId", select: ["firstName", "lastName"] },
                { path: "productVariantId", select: ["productVariantDetails", '_id'] }
            ]);

        for (let user of NotifyMeUsers) {
            try {
                user.customername = user.customerId.firstName.toUpperCase()
                user.productname = user.productVariantId.productVariantDetails[0].productVariantName
                await sendNotification(req, req.userId, user.customerId._id, '7', user, 'other', user.productVariantId._id)
            }
            catch (e) {

            }
        }
    }
    //End Notification Work
    return res.send({ message: "Inventory has been updated" })

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

exports.sellerProductExcelDownload = async (req, res) => {

    // { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } }
    let { search, category, brands, status, subscription, startDate, endDate } = req.body;

    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "productNetPrice": regexp },
            { "productVariantDetails.productVariantName": regexp },
            { "productSKU": regexp },
            { "firstLevel.categoryDetails.categoryName": regexp },
            { "secondLevel.categoryDetails.categoryName": regexp },
            { "thirdLevel.categoryDetails.categoryName": regexp },
            { "products.productDetails.productName": regexp },
            { "brands.brandDetails.brandName": regexp }
        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }

    if (category || brands || status || subscription || startDate || endDate) {
        filter["$and"] = [];
    }
    if (brands) {
        filter["$and"].push({ "brands.brandDetails.brandName": { $in: brands } });
    }
    if (category) {
        filter["$and"].push({ "firstLevel.categoryDetails.categoryName": { $in: category } });
    }
    if (status) {
        filter["$and"].push({ "active": { $in: status } });
    }
    if (subscription) {
        filter["$and"].push({ "subscription": { $in: subscription } });
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

    //console.log(JSON.stringify(filter));
    let productVarints = await allModels.productVariant.aggregate([
        { $match: { "sellerId": mongoose.Types.ObjectId(req.userId) } },

        {
            $lookup: {
                from: "brands",
                localField: "brandId",
                foreignField: "_id",
                as: "brands"
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "products"
            }
        },

        {
            $lookup: {
                from: "categories",
                localField: "products.productCategories.categoryLevel1Id",
                foreignField: "_id",
                as: "firstLevel"
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "products.productCategories.categoryLevel2Id",
                foreignField: "_id",
                as: "secondLevel"
            }
        },
        {
            $lookup: {
                from: "categories",
                localField: "products.productCategories.categoryLevel3Id",
                foreignField: "_id",
                as: "thirdLevel"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "seller"
            }
        },
        { $sort: { "indexNo": -1 } },
        { $match: filter },
    ])

    var wb = XLSX.utils.book_new(); //new workbook
    let excelExportData = []

    //console.log(productVarints);

    for (let index = 0; index < productVarints.length; index++) {
        const element = productVarints[index];
        let a = {
            IndexNo: element.indexNo,
            ProductNameEnglish: null,
            ProductNameArabic: null,
            ProductVariantNameEnglish: null,
            ProductVariantNameArabic: null,
            CategoryLevel1English: null,
            CategoryLevel1Arabic: null,
            BrandEnglish: null,
            BrandArabic: null,
            ProductVariantPrice: element.productNetPrice,
            Stock: element.inventoryQuantity,
            QuantityInStock: element.inventoryQuantity,
            InventoryReOrderLevel: element.inventoryReOrderLevel
        };

        for (let i = 0; i < element.firstLevel.length; i++) {
            const e = element.firstLevel[i];

            for (let il = 0; il < e.categoryDetails.length; il++) {
                const el = e.categoryDetails[il];

                if (il == 0) {
                    a.CategoryLevel1English = el.categoryName;
                }
                else if (il == 1) {
                    a.CategoryLevel1Arabic = el.categoryName;
                }
            }
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
        for (let index = 0; index < element.products[0].productDetails.length; index++) {
            const el = element.products[0].productDetails[index];


            if (index == 0) {
                a.ProductNameEnglish = el.productName;

            }
            else if (index == 1) {
                a.ProductNameArabic = el.productName;

            }
        }
        for (let index = 0; index < element.brands[0].brandDetails.length; index++) {
            const el = element.brands[0].brandDetails[index];

            if (index == 0) {
                a.BrandEnglish = el.brandName;

            }
            else if (index == 1) {
                a.BrandArabic = el.brandName;
            }
        }
        excelExportData.push(a)
    }
    var temp = JSON.stringify(excelExportData);
    temp = JSON.parse(temp);
    var ws = XLSX.utils.json_to_sheet(temp);
    let today = new Date();
    let folder = `uploads/reports/seller-inventory/${req.userId}/`;
    //check if folder exist or not if not then create folder user createdirectory middleware
    await createDirectories(folder);
    var down = `${folder}seller-inventory_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
    XLSX.utils.book_append_sheet(wb, ws, "sheet1");
    XLSX.writeFile(wb, down);
    let newReport = new allModels.reportModel({
        sellerId: req.userId,
        ReportName: "Seller Inventory Report",
        ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
    })

    let data = await newReport.save()
    return res.send({ message: "Your XL will start downloading now.", d: data })
    // return res.send({ d: excelExportData })
}