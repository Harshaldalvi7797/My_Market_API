let allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose");
const { validationResult } = require('express-validator');
let { sendNotification } = require("../../middlewares/sendNotification");


exports.SubscribeProductGet = async (req, res) => {
    let { search, paymentMethod, status, country } = req.body;

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
        filter["$or"] = [
            { "paymentMethod": regexp },
            { "customerName": regexp },

        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) });
            filter["$or"].push({ "totalAmount": parseInt(search) });
            //     filter["$or"]=[
            //    { "totalAmount": parseInt(search)}
            // ]
        }

    }
    if (paymentMethod || status || country) {
        filter["$and"] = [];
    }
    if (paymentMethod) {
        filter["$and"].push({ "paymentMethod": { $in: paymentMethod } });
    }

    if (status) {
        filter["$and"].push({ "subscriptionStatus": { $in: status } });
    }
    if (country) {
        filter["$and"].push({ "customerDelhiveryDetails.shippingDetails.country": { $in: country } });
    }
    const sellerId = mongoose.Types.ObjectId(req.userId);
    let subscribeProduct = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "productVariants"
            }
        },
        { $match: { "productVariants.sellerId": sellerId } },
        {
            $project: {
                productVariants: 0
            }
        },
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders",
            }
        },
        { $match: { "orders.subscriptionId": { $ne: null } } },
        {
            $lookup: {
                from: "subscribeproducts",
                localField: "orders.subscriptionId",
                foreignField: "_id",
                as: "subscribe",
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "orders.customerId",
                foreignField: "_id",
                as: "customer",
            },
        },

        {
            $group: {
                _id: "$orderId",
                indexNo: { "$first": "$subscribe.indexNo" },
                paymentMethod: { "$first": "$orders.paymentMethod" },
                subscriptionId: { "$first": "$subscribe._id" },
                subscriptionType: { "$first": "$subscribe.subscriptionType" },
                subscriptionStatus: { "$first": "$subscribe.status" },
                interval: { "$first": "$subscribe.interval" },
                startDate: { "$first": "$subscribe.fromDate" },
                nextDueDate: { "$first": "$subscribe.nextDueDate" },
                details: { "$first": "$subscribe.details" },
                toDate: { "$first": "$subscribe.toDate" },
                customerName: { "$first": "$customer.firstName" },
                customerId: { "$first": "$customer._id" },
                customerDelhiveryDetails: { "$first": "$orders.customerDelhiveryDetails" },
                status: { "$first": "$subscribe.status" },
                products: { $push: "$$ROOT" },
                subscriptionId: { "$first": "$orders.subscriptionId" },
                totalAmount: { $sum: { $multiply: ["$grandTotal", "$quantity"] } },
                count: { $sum: 1 }
            },
        },
        { $match: filter },
        { $sort: { 'indexNo': -1 } },
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

    const subscribeProductList = subscribeProduct.length ? subscribeProduct[0].paginatedResults : [];
    let totalCount = 0
    try {
        totalCount = subscribeProduct[0].totalCount[0].count
    } catch (err) { }

    return res.json({
        totalCount: totalCount,
        count: subscribeProductList.length,
        data: subscribeProductList
    });
}

exports.summarySubscribe = async (req, res) => {
    const sellerId = mongoose.Types.ObjectId(req.userId);

    const subscribeproduct = await allModels.orderItems.aggregate([
        {
            $lookup: {
                from: "orders",
                localField: "orderId",
                foreignField: "_id",
                as: "orders",
            }
        },
        {
            $lookup: {
                from: "subscribeproducts",
                localField: "orders.subscriptionId",
                foreignField: "_id",
                as: "subscribe",
            }
        },
        { $match: { "orders.subscriptionId": mongoose.Types.ObjectId(req.query.subscriptionId) } },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariantId",
                foreignField: "_id",
                as: "products",
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "seller",
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "orders.customerId",
                foreignField: "_id",
                as: "customer",
            },
        },

        {
            $lookup: {
                from: "ordershippings",
                localField: "orders._id",
                foreignField: "orderId",
                as: "ordershippings",
            }
        },
        {
            $lookup: {
                from: "orderstatusupdates",
                localField: "ordershippings._id",
                foreignField: "orderShippingId",
                as: "orderstatus",
            },
        },
        {
            $group: {
                _id: "$orderId",
                subscribeindexNo: { "$first": "$subscribe.indexNo" },
                paymentMethod: { "$first": "$orders.paymentMethod" },
                subscriptionStatus: { "$first": "$subscribe.status" },
                subscriptionId: { "$first": "$subscribe._id" },
                subscriptionType: { "$first": "$subscribe.subscriptionType" },
                interval: { "$first": "$subscribe.interval" },
                startDate: { "$first": "$subscribe.fromDate" },
                nextDueDate: { "$first": "$subscribe.nextDueDate" },
                details: { "$first": "$subscribe.details" },
                toDate: { "$first": "$subscribe.toDate" },
                customerName: { "$first": "$customer.firstName" },
                customerId: { "$first": "$customer._id" },
                customerDelhiveryDetails: { "$first": "$orders.customerDelhiveryDetails" },
                status: { "$first": "$orderstatus.status" },
                orderShippingId: { "$first": "$ordershippings._id" },
                orderShippingIndexNo: { "$first": "$ordershippings.indexNo" },
                products: { $push: "$$ROOT" },
                seller: { "$first": "$seller" },
                totalAmount: { $sum: { $multiply: ["$grandTotal", "$quantity"] } },
                count: { $sum: 1 }
            },
        },
    ]);
    return res.send({ d: subscribeproduct })
}

exports.SellerSubscribeStatus = async (req, res) => {

    let status = ["Active", "On_Hold", "Cancelled"];
    return res.send({ count: status.length, d: status })
}

exports.SellerSubscribepaymentMethod = async (req, res) => {
    let paymentMethod = ["ONLINE", "CASH", "MY_MARKET_WALLET"];
    return res.send({ count: paymentMethod.length, d: paymentMethod })
}

exports.SellerSubscribeCountry = async (req, res) => {

    let clist = ["Bahrain", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates"];
    let countries = [];
    for (let index = 0; index < clist.length; index++) {
        const element = clist[index];
        let a = { customerDelhiveryDetails: { shippingDetails: { country: element } } }
        countries.push(a)

    }

    return res.send({ count: countries.length, d: countries })
}

exports.subscriptionCancel = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        //  console.log(req.userId)
        let subscribe = await allModels.subscribeModel.findOne({ "_id": req.body.subscriptionId })

        if (!subscribe) {
            return res.send({ message: "No data Found" })
        }
        subscribe.status = req.body.status
        subscribe.statusComment = req.body.statusComment

        await subscribe.save()

        if (req.body.status == "Cancelled") {
            let order = await allModels.orderModel.findOne({ subscriptionId: subscribe._id });
            if (order) {
                let orderItem = await allModels.orderItems.findOne({ orderId: order._id });
                if (orderItem) {
                    orderItem.Cancelled = true
                    orderItem.CancelledComment = req.body.statusComment
                    orderItem.CancelledDateTime = new Date()
                    await orderItem.save();
                }
            }
        }


        return res.send({ message: "Subscription has been cancelled!" })

        //return res.send({ d: subscribe })
    }
    catch (error) {
        return res.status(403).send({ "message": error.message })
    }

}

exports.holdSubscription = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let subscribe = await allModels.subscribeModel.findOne({ "_id": req.body.subscriptionId })
        .populate([
            {path: "customerId", select: ["firstName", "lastName", "emailAddress"]},
            {
                path: "productVariantId",
                select: ["productVariantDetails"],
                populate: {
                    path: "sellerId", select: ["sellerDetails", "nameOfBussinessEnglish"]
                }
            }
        ])
        
        if (!subscribe) {
            return res.send({ message: "No data Found" })
        }
       
        subscribe.status = req.body.status
        subscribe.statusComment = req.body.statusComment
        subscribe.resolutionDate = req.body.resolutionDate

        subscribe.save()
        res.send({ message: "Subscription on hold!" }) 
   
        //For Notification
        subscribe.customername= subscribe.customerId.firstName.toUpperCase()
        subscribe.sellername= subscribe.productVariantId.sellerId.nameOfBussinessEnglish
        subscribe.productname= subscribe.productVariantId.productVariantDetails[0].productVariantName
    
        sendNotification(req, subscribe.productVariantId.sellerId._id, subscribe.customerId._id, '11', subscribe, 'subscription', subscribe._id)
    }
    catch (error) {
        return res.status(403).send({ "message": error.message })
    }
}

exports.activateSubscription = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let subscribe = await allModels.subscribeModel.findOne({ "_id": req.body.subscriptionId })

        if (!subscribe) {
            return res.send({ message: "No data Found" })
        }

        if (subscribe.status == "Cancelled") {
            return res.send({ message: "You can not activate cancel subscription" })
        }
        subscribe.status = req.body.status
        subscribe.statusComment = req.body.statusComment


        subscribe.save()


        return res.send({ message: "Subscription has been activated!" })




    }
    catch (error) {
        return res.status(403).send({ "message": error.message })
    }

}




