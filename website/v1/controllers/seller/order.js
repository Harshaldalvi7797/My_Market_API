let allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose");
const { validationResult } = require('express-validator');
let { sendNotification } = require("../../middlewares/sendNotification");
let { sellerReceipt } = require("../../middlewares/receiptTemplate");

exports.ordersWithSearch = async (req, res) => {
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
        if (isNaN(parseInt(search))) {
            const regexp = new RegExp(search, "i");
            filter["$or"] = [
                { "order.paymentMethod": regexp },
                { "customer.fullName": regexp },
                // { "customer.firstName": regexp },
                // { "customer.lastName": regexp },
                { "order.customerDelhiveryDetails.shippingDetails.country": regexp },


            ];
        }
        if (!isNaN(parseInt(search))) {
            if (!filter["$or"]) { filter["$or"] = [] }
            filter["$or"].push({ "order.indexNo": parseInt(search) });
            filter["$or"].push({ "totalAmount": parseInt(search) });

        }

    }
    if (paymentMethod || status || country) {
        filter["$and"] = [];
    }
    if (paymentMethod) {
        filter["$and"].push({ "order.paymentMethod": { $in: paymentMethod } });
    }

    if (status) {
        filter["$and"].push({ "orderstatusupdate.status": { $in: status } });
    }
    if (country) {
        filter["$and"].push({ "order.customerDelhiveryDetails.shippingDetails.country": { $in: country } });
    }

    try {
        const sellerId = mongoose.Types.ObjectId(req.userId);

        const orders = await allModels.orderShippingNew.aggregate([
            { $match: { sellerId: sellerId } },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orders'
                }
            },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orders._id',
                    foreignField: 'orderId',
                    as: 'orderitems'
                }
            },
            {
                $unwind: { path: "$orderitems" }
            },
            {
                $addFields: {
                    isCancelReturnRefund: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: ["$orderitems.Cancelled", true] },
                                    { $eq: ["$orderitems.Returned", true] },
                                    { $eq: ["$orderitems.Refunded", true] }
                                ]
                            }, then: true, else: false
                        }
                    },
                }
            },
            {
                $match: {
                    "orderitems.sellerId": sellerId
                }
            },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    as: "orderstatusupdates",
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$$id", "$orderShippingId"] }
                            }
                        },
                        { $sort: { _id: -1 } },
                        { $limit: 1 }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'orders.customerId',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: "$customer" },
            { $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
            {
                $project: {
                    "_id": 1,
                    "orders": 1,
                    "sellerId": 1,
                    "customer.fullName": 1,
                    "customer.firstName": 1,
                    "customer.lastName": 1,
                    "orderitems._id": 1,
                    "orderitems.totalUnitPrice":1,
                    "orderitems.grandTotal": 1,
                    "orderitems.quantity": 1,
                    "orderitems.productVariantId": 1,
                    "orderitems.sellerId": 1,
                    "orderitems.Cancelled": 1,
                    "orderitems.Returned": 1,
                    "orderitems.Refunded": 1,
                    "isCancelReturnRefund": 1,
                    "orderstatusupdates": 1,
                    "shippingPrice": 1
                }
            },
            {
                $project: {
                    _id: 1,
                    shippingPrice: 1,
                    orderstatusupdates: 1,
                    orders: 1,
                    orderitems: 1,
                    isCancelReturnRefund: 1,
                    customer: 1,
                    sellerId: 1,
                    total: { $multiply: ["$orderitems.totalUnitPrice", "$orderitems.quantity"] }
                }
            },
            // { $unwind: { path: "$orderstatusupdates" } },
            { $unwind: { path: "$orders" } },
            { $unwind: { path: "$customer" } },
            {
                $group: {
                    _id: "$orders._id",
                    totalAmount: { $sum: "$total" },
                    shippingPrice: { $first: "$shippingPrice" },
                    sellerId: { $first: "$sellerId" },
                    orderitems: {
                        $push: "$orderitems"
                    },
                    isCancelReturnRefund: { $max: "$isCancelReturnRefund" },
                    order: { $first: "$orders" },
                    customer: { $first: "$customer" },
                    orderstatusupdate: { $first: "$orderstatusupdates" }
                }
            },

            { $match: filter },
            { $sort: { "order.indexNo": -1 } },
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
        const orderList = orders.length ? orders[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = orders[0].totalCount[0].count
        } catch (err) { }
        return res.json({ totalCount: totalCount, count: orderList.length, data: orderList });

    } catch (error) {
        return res.status(500).send({
            message: error.message,
        });
    }
}

exports.singleOrder = async (req, res) => {
    const sellerId = mongoose.Types.ObjectId(req.userId);

    let orders = await allModels.orderShippingNew.aggregate([
        {
            $match: {
                $and: [
                    { "sellerId": sellerId },
                    { "orderId": mongoose.Types.ObjectId(req.query.orderId) },
                ]
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
                from: "sellers",
                localField: "sellerId",
                foreignField: "_id",
                as: "seller",
            },
        },
        {
            $lookup: {
                from: "orderitems",
                localField: "orderId",
                foreignField: "orderId",
                as: "orderitems",
            }
        },
        { $unwind: { path: "$orderitems" } },
        // { $match: { "orderitems.sellerId": sellerId } },
        {
            $lookup: {
                from: "offerpricingitems",
                localField: "orderitems.offerPricingItemId",
                foreignField: "_id",
                as: "offerpricingitems",
            }
        },
        { $unwind: { path: "$offerpricingitems", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "offerpricings",
                localField: "offerpricingitems.offerpricingId",
                foreignField: "_id",
                as: "offerpricings",
            }
        },
        { $unwind: { path: "$offerpricings", preserveNullAndEmptyArrays: true } },
        { $addFields: { "orderitems.offerName": "$offerpricings.offerName", "orderitems.offerIndexNo": "$offerpricings.indexNo" } },
        {
            $group: {
                _id: "$orderId",
                shippingId: { $first: "$_id" },
                seller: { $first: "$seller" },
                customer: { $first: "$customer" },
                orders: { $first: "$orders" },

                shippingMethod: { $first: "$shippingMethod" },
                shippingPrice: { $first: "$shippingPrice" },
                externalAWB: { $first: "$externalAWB" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                indexNo: { $first: "$indexNo" },
                orderitems: {
                    $push: "$orderitems"
                }
            }
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "orderitems.productVariantId",
                foreignField: "_id",
                as: "productvariant",
            }
        },
        {
            $lookup: {
                from: "orderstatusupdates",
                localField: "shippingId",
                foreignField: "orderShippingId",
                as: "orderstatus",
            },
        },
        // { $unwind: "$orderstatus" },
        { $unwind: "$customer" },
        { $unwind: "$seller" },
        { $unwind: "$orders" },

        {
            $project: {
                "orders.customerId": 0,
                "orders.createdDate": 0,
                "orders.updatedDate": 0,
                "orders.billingAddressId": 0,
                "orders.shippingAddressId": 0,

                "customer.otp": 0,
                "customer.password": 0,
                "customer.resetpasswordtoken": 0,
                "customer.expireOtp": 0,
                "customer.createdDate": 0,
                "customer.updatedDate": 0,

                "orderstatus.createdDate": 0,
                "orderstatus.updatedDate": 0,

                "orderitems.createdDate": 0,
                "orderitems.updatedDate": 0,
            }
        },
        {
            $project: {
                // customerDelhiveryDetails: { "$first": "$orders.customerDelhiveryDetails" },
                orderstatus: 1,
                "productvariant._id": 1,
                "productvariant.productVariantDetails": 1,
                'seller.nameOfBussinessEnglish': 1,
                'seller.sellerDetails': 1,
                orderitems: 1,
                customer: 1,
                orders: 1,
                shippingMethod: 1,
                shippingPrice: 1,
                order_shipping_id: { $concat: ['#', { $toString: "$orders.indexNo" }, "_", { $toString: "$indexNo" }] },
                externalAWB: 1, indexNo: 1, createdAt: 1, updatedAt: 1
            }
        }
    ])
    orders[0] = await sellerReceipt(req, orders[0]);

    return res.send({ d: orders })
}

exports.bulkorderStatusUpdate = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let orderShipping = await allModels.orderShippingNew.find({ "_id": req.body.orderShippingId }).select(["-receipt", "-__v"])
    for (let index = 0; index < orderShipping.length; index++) {
        const element = orderShipping[index];
        // console.log(JSON.stringify(element))
        let shippingStatus = new allModels.orderStatusUpdate(
            {
                status: req.body.status,
                orderShippingId: element._id,
                updatedBy: "Seller"
            }
        )
        await shippingStatus.save()
    }
    return res.send({ message: "Status has been updated." });
}

exports.orderShippingStatusUpdate = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let shipping = await allModels.orderShippingNew.findOne({
            _id: req.body.orderShippingId
        }).populate([
            { path: 'sellerId', select: ['_id', 'sellerDetails', 'nameOfBussiness', 'emailAddress', 'sellerAddress'] },
            {
                path: 'orderId',
                populate: [
                    { path: 'customerId', select: ['_id', 'firstName', 'lastName', 'emailAddress', 'mobilePhone','indexNo'] }
                ]
            }
        ])

        if (!shipping) {
            return res.send({ message: "Please enter valid order shipping Id" })
        }
        else if (shipping.sellerId._id != req.userId) {
            return res.send({ message: "Shipping is not belongs to you" })
        }

        let orderItems = await allModels.orderItems.find({ orderId: shipping.orderId._id, sellerId: req.userId })
        shipping['orderItems'] = orderItems

        //check if order is cancelled or delivered
        let currentStatus = await allModels.orderStatusUpdate.findOne({ orderShippingId: shipping._id }).sort([['indexNo', '-1']]);
        if (currentStatus && (currentStatus.status.toLowerCase() == "cancelled" || currentStatus.status.toLowerCase() == "delivered" || currentStatus.status.toLowerCase() == "refunded"

        )) {
            return res.status(403).send({ message: `Order status cannot be changed as it is ${currentStatus.status}` });
        } else if (currentStatus.status == "Shipped" && (req.body.status == "Processing" || req.body.status == "On_Hold")) {
            return res.status(403).send({ message: `Order status cannot changed to ${req.body.status.replace(/_/g, " ")} as it is ${currentStatus.status}` });
        }

        if (currentStatus.status == (req.body.status)) {
            return res.status(403).send({ message: "Order status cannot changed" })
        }

        let lastOrderStatusIndex = await allModels.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
        if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }

        let shippingStatus = new allModels.orderStatusUpdate({
            status: req.body.status,
            orderShippingId: req.body.orderShippingId,
            updatedBy: "Seller",
            indexNo: lastOrderStatusIndex['indexNo'] + 1
        })
        await shippingStatus.save()

        // let update = { status: req.body.status }
        // let updateStatus = await allModels.orderStatusUpdate.updateOne({ "orderShippingId": req.body.orderShippingId }, { $set: update })

        let productname = ''
        for (let item of shipping.orderItems) {
            productname += item.productVariantDetails[0].productVariantName + ', '
        }

        shipping.customernumber = shipping.orderId.customerId.indexNo
        shipping.orderItems = orderItems
        shipping.customername = shipping.orderId.customerDelhiveryDetails.billingDetails.customerName.toUpperCase()
        shipping.ShippindAddress = `${shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine1}${shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine2 ? '</br>' + shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine2 : ''}${shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine3 ? '<br>' + shipping.orderId.customerDelhiveryDetails.shippingDetails.addressLine3 : ''}<br>${(shipping.orderId.customerDelhiveryDetails.shippingDetails.city)?shipping.orderId.customerDelhiveryDetails.shippingDetails.city:''}<br>${(shipping.orderId.customerDelhiveryDetails.shippingDetails.state)?shipping.orderId.customerDelhiveryDetails.shippingDetails.state:''} ${(shipping.orderId.customerDelhiveryDetails.shippingDetails.pincode)?shipping.orderId.customerDelhiveryDetails.shippingDetails.pincode:''}<br> ${(shipping.orderId.customerDelhiveryDetails.shippingDetails.poBox)?shipping.orderId.customerDelhiveryDetails.shippingDetails.poBox:''}`

        shipping.SellerAddress = `${shipping.sellerId.sellerAddress.companyAddress.companyAdd1}${shipping.sellerId.sellerAddress.companyAddress.companyAdd2 ? '<br>' + shipping.sellerId.sellerAddress.companyAddress.companyAdd2 : ''}<br>${shipping.sellerId.sellerAddress.companyAddress.companyCity} ${shipping.sellerId.sellerAddress.companyAddress.companyPincode}<br>${shipping.sellerId.sellerAddress.companyAddress.companypoBox}<br>${shipping.sellerId.sellerAddress.companyAddress.companyblockNumber}`
        shipping.ordernumber = shipping.orderId.indexNo + '_' + shipping.indexNo
        shipping.trackingnumber = shipping.indexNo
        shipping.shippingStatus = shippingStatus

        //Sending Notification
        var customerNotification = null
        var sellerNotification = null
        if (req.body.status == 'Delivered') {
            customerNotification = '3'
            sellerNotification = '20'
        }
        else if (req.body.status == 'Shipped') {
            customerNotification = '2'
        }

        if (customerNotification) {
            await sendNotification(req, req.userId, shipping.orderId.customerId._id, customerNotification, shipping, 'order status', shipping._id)

            if (req.body.status == 'Delivered') {
                for (let item of orderItems) {
                    //Sending notification to review product
                    productname = item.productVariantDetails[0].productVariantName
                    item.productname = productname
                    await sendNotification(req, req.userId, shipping.orderId.customerId._id, '18', item, 'order status', item.productVariantId)
                }
            }
        }
        if (sellerNotification) {
            await sendNotification(req, null, req.userId, sellerNotification, shipping, 'order status', shipping._id)
        }
        //End Sending Notification

        return res.send({ message: "Order status has been updated!" })
    }
    catch (error) {
        console.log(error)
        return res.status(403).send({ "message": error.message })
    }
}

exports.cancelOrder = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let shipping = await allModels.orderShippingNew.findOne({ "_id": req.body.orderShippingId })
            .populate([
                {
                    path: 'orderId',
                    populate: {
                        path: 'customerId'
                    }
                }
            ])
        if (!shipping) {
            return res.send({ message: "Please enter valid order shipping Id" })
        }

        let update = { status: req.body.status, cancelComment: req.body.cancelComment }
        await allModels.orderStatusUpdate.updateOne({
            "orderShippingId": req.body.orderShippingId
        }, { $set: update })

        //Sending Notification
        let orderItemList = await allModels.orderItems.find({ orderId: shipping.orderId._id, sellerId: req.userId })
        data = {}
        data.shippingPrice = shipping.shippingPrice
        data.customername = shipping.orderId.customerId.firstName.toUpperCase()
        data.sellername = req.seller.nameOfBussinessEnglish
        data.ordernumber = shipping.orderId.indexNo + '_' + shipping.indexNo
        data.order = shipping.orderId
        data.orderItemList = orderItemList
        data.CancellationReason = "Seller Cancelled"

        //For Customer
        await sendNotification(req, req.userId, shipping.orderId.customerId._id, '57', data, 'order', data.order._id)
        //For Seller
        sendNotification(req, null, req.userId, '58', data, 'order', data.order._id)
        //End Sending Notification

        return res.send({ message: "Order has been cancelled!" })
    }
    catch (error) {
        return res.status(403).send({ "message": error.message })
    }
}

exports.sellerCancelProduct = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let orderproduct = await allModels.orderItems.findOne({ "_id": req.body.id })
        if (!orderproduct) {
            return res.send({ messgae: "No Found" })
        }

        let shipping = await allModels.orderShippingNew.findOne({
            orderId: orderproduct.orderId,
            sellerId: orderproduct.sellerId
        })

        let shippingStatus = await allModels.orderStatusUpdate.findOne({
            orderShippingId: shipping._id
        }).sort([['indexNo', '-1']]);
        //  console.log("shipping", shipping)
        // return res.send({ count: shippingStatus.length, data: shippingStatus }
        // )

        if (shippingStatus.status === "Delivered") {
            return res.status(403).send({ message: "This product can't be cancelled it's already delivered" })
        } else if (shippingStatus.status === "Shipped") {
            return res.status(403).send({ message: "This product can't be cancelled it's already shipped" })
        }
        orderproduct.Cancelled = req.body.Cancelled
        orderproduct.CancelledBy = 'Seller'
        orderproduct.CancelledComment = req.body.CancelledComment
        orderproduct.CancelledDateTime = new Date()
        await orderproduct.save()

        //orderstatusupdate validation failed: status: `true` is not a valid enum value for path `status`.
        let orderproductList = await allModels.orderItems.find({ "orderId": orderproduct.orderId })

        if (orderproductList.length == 1) {
            let orderShipping = await allModels.orderShippingNew.findOne({
                orderId: orderproduct.orderId,
                sellerId: req.userId
            })
            if (orderShipping) {
                /* let orderShippingStatus = await allModels.orderStatusUpdate.findOne({
                    orderShippingId: orderShipping._id
                }) */
                // if (orderShippingStatus) {
                let lastOrderStatusIndex = await allModels.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
                if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }
                let shippingStatus = new allModels.orderStatusUpdate({
                    status: "Cancelled",
                    orderShippingId: orderShipping._id,
                    updatedBy: "Seller",
                    indexNo: lastOrderStatusIndex['indexNo'] + 1
                })
                await shippingStatus.save()
                // }
            }
        }
        return res.send({ message: "product has been cancelled!" })
    }
    catch (error) {
        return res.status(403).send({ "message": error.message })
    }
}
