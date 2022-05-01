var allModels = require('../../../../utilities/allModels');
let mongoose = require("mongoose")
const { validationResult } = require('express-validator');
const { writeLog } = require("./../../../../utilities/log");
const request = require('request-promise');
let aramex = require('./../../middlewares/aramex');
let { sendNotification } = require("../../middlewares/sendNotification");

exports.subscribeProduct = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let reqData = req.body;
    let productVariant = await allModels.productVariant.findById(reqData.productVariantId);

    if (!productVariant) { return res.status(403).send({ message: "Invalid product variant id selected" }); }
    let subscribe = null;

    subscribe = await allModels.subscribeModel.findOne({
        customerId: req.userId,
        'productVariants.productVariantId': reqData.productVariantId
    })
    if (reqData.quantity < 0) {
        reqData.quantity = 1;
    }
    //console.log(req.userId);
    if (!subscribe) {
        let lastIndex = await allModels.subscribeModel.findOne().sort([['indexNo', '-1']]);
        if (!lastIndex) { lastIndex = {}; lastIndex['indexNo'] = 1000 }

        let subscribeP = await new allModels.subscribeModel({
            customerId: req.userId,

            productVariantId: productVariant._id,
            fromDate: reqData.fromDate,
            toDate: reqData.toDate,
            quantity: reqData.quantity,

            deliveryAddress: reqData.deliveryAddress,

            subscriptionType: reqData.subscriptionType,
            interval: reqData.interval,

            details: [reqData.details],
            deviceIdentifier: reqData.deviceIdentifier,
            indexNo: lastIndex.indexNo + 1
        });

        let data = await subscribeP.save();

        /**Creating order and order status */
        let address = reqData.deliveryAddress;
        let addressDetails = {
            billingDetails: {
                customerName: `${req.customer.firstName} ${req.customer.lastName}`,
                companyName: '',
                addressLine1: address['addressLine1'],
                addressLine2: address['addressLine2'],
                addressLine3: "",
                pincode: address['pincode'],
                poBox: address['poBox'] || null,
                city: address['city'],
                state: address['state'],
                country: address['country'],
                contactPhone: address['contactNumber'],
                mobilePhone: req.customer.mobilePhone,
                emailAddress: req.customer.emailAddress
            },
            shippingDetails: {
                customerName: `${req.customer.firstName} ${req.customer.lastName}`,
                companyName: '',
                addressLine1: address['addressLine1'],
                addressLine2: address['addressLine2'],
                addressLine3: "",
                pincode: address['pincode'],
                poBox: address['poBox'] || null,
                city: address['city'],
                state: address['state'],
                country: address['country'],
                contactPhone: address['contactNumber'],
                mobilePhone: req.customer.mobilePhone,
                emailAddress: req.customer.emailAddress
            }
        }

        let lastOrderIndex = await allModels.orderModel.findOne().sort([['indexNo', '-1']]);
        if (!lastOrderIndex) { lastOrderIndex = {}; lastOrderIndex['indexNo'] = 1000 }

        let newOrder = new allModels.orderModel({
            customerId: req.userId,
            deviceIdentifier: reqData.deviceIdentifier,
            subscriptionId: data._id,
            subscriptionIndexNo: data.indexNo,
            customerDelhiveryDetails: addressDetails,
            paymentMethod: "ONLINE",
            payment: reqData.payment || {},
            indexNo: lastOrderIndex.indexNo + 1
        })

        req.customerAddress = addressDetails;
        let { productVariants, orderShippingList } = await this.addOrderProduct(req, reqData, newOrder);
        let orderIds = [];
        if (typeof orderShippingList == "object" && orderShippingList.length > 0) {
            orderIds = orderShippingList.map(m => `#${newOrder.indexNo}_${m.indexNo}`);
        }

        let data1 = {
            order: newOrder,
            orderProductVariants: productVariants,
            orderIds: orderIds
        }
        await newOrder.save()

        data.customername = req.customer.firstName.toUpperCase()
        data.productname = productVariant.productVariantDetails[0].productVariantName
        data.productVariant = productVariant
        data.subscriptionnumber = subscribeP.indexNo
        data.subscription = subscribeP

        await sendNotification(req, null, req.userId, '8', data, 'subscribe', data._id)
        sendNotification(req, null, productVariant.sellerId, '26', data, 'subscribe', data._id)

        return res.send({ message: "Product added to subscribeP!", data: data })
    }
    else {
        return res.send({ message: "You are already subscribed to this product!" })
    }
}

//add order product
exports.addOrderProduct = async (req, data, order) => {
    return new Promise(async (resolve, reject) => {
        let productVariants = [];
        let orderShippingList = [];
        let orderId = order._id;

        let product = await allModels.productVariant.findOne({ _id: data.productVariantId }).populate([{ path: "sellerId" }])

        data.courierId = data.orderProductStatus = data.airwayBill = '';
        product.inventoryQuantity = (parseInt(product.inventoryQuantity) - (parseInt(data.quantity))).toString()
        product.save()

        //Notification work for OOS and RE-orderpoint
        if (parseInt(product.inventoryQuantity) <= 0) {
            product.productname = product.productVariantDetails[0].productVariantName
            await sendNotification(req, null, product.sellerId._id, '25', product, 'Inventory', product._id)
        }
        else if (parseInt(product.inventoryQuantity) <= parseInt(product.inventoryReOrderLevel)) {
            product.productname = product.productVariantDetails[0].productVariantName
            await sendNotification(req, null, product.sellerId._id, '24', product, 'Inventory', product._id)
        }
        //End Notification work

        //end call ithinklogistics api
        try {
            let checkShiping = await allModels.orderShippingNew.findOne({
                orderId: orderId,
                sellerId: product.sellerId
            });

            let totalDiscount = 0;
            totalDiscount = (parseFloat(product['productNetPrice']) - parseFloat(product['subscriptionPrice'].toString()))
            writeLog("---add order item totalDiscount 1---", {
                netprice: parseFloat(product['productNetPrice']),
                totalDiscount: (parseFloat(product['productNetPrice']) - parseFloat(product['subscriptionPrice'].toString()))
            })
            let totalUnitPrice = parseFloat(product['productNetPrice']) - totalDiscount

            let lastOrderItemIndex = await allModels.orderItems.findOne().sort([['indexNo', '-1']]);
            if (!lastOrderItemIndex) { lastOrderItemIndex = {}; lastOrderItemIndex['indexNo'] = 1000 }

            const orderProducts = new allModels.orderItems({
                orderId: orderId,
                productVariantId: product._id,
                sellerId: product.sellerId,
                productVariantDetails: product['productVariantDetails'],//productDetails,
                productVariantImages: product['productVariantImages'],
                sellerId: product["sellerId"],
                retailPrice: product["productNetPrice"],//product['subscriptionPrice'],
                quantity: data.quantity,
                offerPrice: 0,
                couponCode: 0,
                couponDiscount: 0,

                shipment: {
                    shipmentWidth: product.shipmentWidth,
                    shipmentLength: product.shipmentLength,
                    shipmentHeight: product.shipmentHeight,
                    shipmentWeight: product.shipmentWeight,
                },

                totalDiscount: totalDiscount,
                totalUnitPrice: totalUnitPrice,
                grandTotal: totalUnitPrice * parseInt(data.quantity.toString()),
                totalTax: parseFloat(product['productTaxPrice'].toString()),
                indexNo: lastOrderItemIndex.indexNo + 1,
                commissionPercentage: product.sellerId.commissionPercentage
            })
            await orderProducts.save();
            productVariants.push(orderProducts);

            if (!checkShiping) {
                let lastOrderShippingIndex = await allModels.orderShippingNew.findOne().sort([['indexNo', '-1']]);
                if (!lastOrderShippingIndex) { lastOrderShippingIndex = {}; lastOrderShippingIndex['indexNo'] = 1000 }

                let orderShipping = await allModels.orderShippingNew({
                    orderId: orderId,
                    sellerId: product.sellerId,
                    // externalAWB: 4512,
                    shippingPrice: (data['shippingPrice']) ? parseFloat((parseFloat(data['shippingPrice'].toString())).toFixed(2)) : 0,
                    shippingMethod: product.sellerId.deliveryMethod,
                    indexNo: lastOrderShippingIndex.indexNo + 1
                })
                await orderShipping.save();
                orderShippingList.push(orderShipping);

                let lastOrderStatusIndex = await allModels.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
                if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }

                let orderStatus = await allModels.orderStatusUpdate({
                    status: "New",
                    orderShippingId: orderShipping._id,
                    description: "New order from app",
                    indexNo: lastOrderStatusIndex.indexNo + 1
                })
                await orderStatus.save();
            }

            //notification.addNotification(req.userId, product['sellerId'], "order", `New Order Placed [Product name: ${product['productVariantDetails'][0].productVariantName}]`, "app", orderId)
            //notification.addNotification(req.userId, product['sellerId'], "order", `New Order Placed [Product name: ${product['productVariantDetails'][0].productVariantName}]`, "email", orderId)


        } catch (error) {
            //console.log(error);
            writeLog("---add order item error---", error.message)
        }

        await aramexShippingApi(req, order, productVariants, orderShippingList);
        resolve(productVariants);

        // });
    });
}

const aramexShippingApi = async (customerData, orderData, orderItem, shippingData) => {
    let data = {
        seller: null,
        customer: { details: null, address: null },
        order: {
            id: orderData, products: [], totalWeight: 0, length: 0, width: 0, height: 0, CashOnDeliveryAmount: 0, CollectAmount: 0,
            services: ""
        }
    }


    if (customerData && customerData.customerAddress) {
        data.customer.address = customerData.customerAddress.shippingDetails
        data.customer.details = await allModels.customer.findOne({ _id: customerData.userId });
    }

    for (let index = 0; index < shippingData.length; index++) {
        const element = shippingData[index];
        data.seller = element.sellerId
        if (element.sellerId.deliveryMethod == "MM Drive") {
            data.order.products = [];
            data.order.totalWeight = 0;
            data.order.length = 0;
            data.order.width = 0;
            data.order.height = 0;

            let itemFilter = orderItem.filter(f => f.sellerId._id.toString() == element.sellerId._id.toString());
            let totalAmount = element.shippingPrice
            if (itemFilter.length > 0) {
                for (let itemIndex = 0; itemIndex < itemFilter.length; itemIndex++) {
                    const ele = itemFilter[itemIndex];
                    let item = {
                        PackageType: "Box",
                        Quantity: 0,
                        Weight: {
                            Unit: "Kg",
                            Value: 0
                        },
                        Comments: "",
                        Reference: ""
                    }

                    item.Quantity = ele.quantity;
                    item.Weight.Value = (parseFloat(ele.shipment.shipmentWeight).toString().toLowerCase() != 'nan') ? parseFloat(ele.shipment.shipmentWeight) : 0;
                    item.Comments = ele.productVariantDetails[0].productVariantName;

                    totalAmount = totalAmount + (ele.quantity * ele.totalUnitPrice)
                    if (parseFloat(ele.shipment.shipmentLength).toString().toLowerCase() == 'nan') {
                        ele.shipment.shipmentLength = '0.0';
                    }
                    if (parseFloat(ele.shipment.shipmentWidth).toString().toLowerCase() == 'nan') {
                        ele.shipment.shipmentWidth = '0.0';
                    }
                    if (parseFloat(ele.shipment.shipmentHeight).toString().toLowerCase() == 'nan') {
                        ele.shipment.shipmentHeight = '0.0';
                    }

                    data.order.totalWeight = data.order.totalWeight + item.Weight.Value;
                    data.order.length = data.order.length + parseFloat(ele.shipment.shipmentLength);
                    data.order.width = data.order.width + parseFloat(ele.shipment.shipmentWidth);
                    data.order.height = data.order.height + parseFloat(ele.shipment.shipmentHeight);

                    data.order.products.push(item);
                }
            }
            //if order payment type is COD
            if (data.order.id.paymentMethod == "CASH") {
                data.order.CashOnDeliveryAmount = totalAmount;
                data.order.CollectAmount = 0;
                data.order.services = "CODS";
            } else {
                data.order.CashOnDeliveryAmount = 0;
                data.order.CollectAmount = 0;
            }

            //if customer and seller is from same country
            if (element.sellerId.sellerAddress.orderPickupAddress.companyOrderAddCountryCode.toLowerCase() == data.customer.address.country.toLowerCase()) {
                let aramexShipping = await aramex.createShipment(data);
                /*  console.log("..");
                 console.log(JSON.stringify(aramexShipping));
                 console.log("----------------------------------------"); */
            }
            //if customer and seller is from different country 
            else if (element.sellerId.sellerAddress.orderPickupAddress.companyOrderAddCountryCode.toLowerCase() != data.customer.address.country.toLowerCase()) {
                let aramexShipping = await aramex.createShipment(data, "EXP", "PPX");
                /* console.log("..");
                console.log(JSON.stringify(aramexShipping));
                console.log("----------------------------------------"); */
            }

        }
    }
}


exports.getSubscribe = async (req, res) => {
    let checkSubscribe = null;

    checkSubscribe = await allModels.subscribeModel.find({
        customerId: req.userId,
        status: { $ne: "Cancelled" }
    }).select(["productVariantId"]);


    if (!checkSubscribe) {
        return res.send({ message: "You haven't subscribe any product" });
    }

    //console.log(checkCart)
    return res.send({ count: checkSubscribe.length, data: checkSubscribe })
}

//New apis
exports.subscriptionWithSearch = async (req, res) => {

    let { search, status } = req.body;
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
    let filterSearch = {};
    let filter = {};

    if (status) {
        try {
            if (!filter["$and"]) {
                filter["$and"] = [{ "subscription.status": status }]
            } else {
                filter["$and"].push({ "subscription.status": status });
            }
        } catch (error) {
            console.log(error.message);
        }

    }

    if (search) {
        if (isNaN(parseInt(search))) {
            //console.log(search.split(" "))
            const regexp = new RegExp(search, "i");
            filterSearch["$or"] = [
                { "paymentMethod": regexp },
                { "customer.fullName": regexp },
                { "customerDelhiveryDetails.shippingDetails.country": regexp },
                { "seller.nameOfBussinessEnglish": regexp },
                { "seller.sellerCountry": regexp },
                { "subscription.subscriptionType": regexp },
                // { "order_shipping_id": regexp }
            ];
        }
        if (!isNaN(parseInt(search))) {
            if (!filterSearch["$or"]) { filterSearch["$or"] = [] }

            let totalPrice = { $gt: parseFloat(search) - 1, $lt: parseFloat(search) + 1 };
            // console.log(totalPrice);
            filterSearch["$or"].push({ "subscription.indexNo": parseInt(search) });
            filterSearch["$or"].push({ "totalPrice": totalPrice });
        }

    }

    try {
        let orderItemFilter = {
            $expr: {
                $and: [
                    { $eq: ["$orderId", "$$orderId"] },
                    { $eq: ["$sellerId", "$$sellerId"] }
                ]
            }
        }

        // console.log(req.userId);
        const orderShipping = await allModels.orderModel.aggregate([
            { $match: { customerId: mongoose.Types.ObjectId(req.userId) } },
            {
                $lookup: {
                    from: "subscribeproducts",
                    localField: "subscriptionId",
                    foreignField: "_id",
                    as: "subscription",
                }
            },
            { $match: { subscriptionId: { $ne: null } } },
            { $unwind: "$subscription" },
            {
                $lookup: {
                    from: "ordershippings",
                    localField: "_id",
                    foreignField: "orderId",
                    as: "orderShippings",
                }
            },
            {
                $lookup: {
                    from: "customers",
                    localField: "customerId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$customer" },
            { $unwind: "$orderShippings" },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    localField: "orderShippings._id",
                    foreignField: "orderShippingId",
                    as: "orderStatusUpdate",
                }
            },
            {
                $lookup: {
                    from: "sellers",
                    localField: "orderShippings.sellerId",
                    foreignField: "_id",
                    as: "sellers",
                },
            },
            { $addFields: { orderStatus: { $last: "$orderStatusUpdate.status" } } },
            {
                $lookup: {
                    from: "orderitems",
                    let: {
                        orderId: "$orderShippings.orderId",
                        sellerId: "$orderShippings.sellerId",
                    },
                    pipeline: [
                        {
                            $match: orderItemFilter
                        }
                    ],
                    as: "orderItems",
                },
            },
            {
                $lookup: {
                    from: "productvariants",
                    localField: "orderItems.productVariantId",
                    foreignField: "_id",
                    as: "pv",
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "pv.productId",
                    foreignField: "_id",
                    as: "products",
                },
            },
            { $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
            { $addFields: { "categoryLevel1": { $first: "$products.productCategories.categoryLevel1Id" } } },
            { $addFields: { "categoryLevel2": { $first: "$products.productCategories.categoryLevel2Id" } } },
            { $addFields: { "categoryLevel3": { $first: "$products.productCategories.categoryLevel3Id" } } },
            {
                $unwind: {
                    "path": "$categoryLevel1",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $unwind: {
                    "path": "$categoryLevel2",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $unwind: {
                    "path": "$categoryLevel3",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryLevel1",
                    foreignField: "_id",
                    as: "categoryLevel1",
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryLevel2",
                    foreignField: "_id",
                    as: "categoryLevel2",
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "categoryLevel3",
                    foreignField: "_id",
                    as: "categoryLevel3",
                },
            },
            {
                $unwind: {
                    "path": "$categoryLevel1",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $unwind: {
                    "path": "$categoryLevel2",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $unwind: {
                    "path": "$categoryLevel3",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $project: {
                    //customer: 1,
                    customerDelhiveryDetails: 1,
                    orderShippings: 1,
                    seller: {
                        nameOfBussiness: { $first: "$sellers.nameOfBussinessEnglish" },
                        sellerCountry: { $replaceAll: { input: { $first: "$sellers.sellerCountry" }, find: "_", replacement: " " } },
                        sellerFilterCountry: { $first: "$sellers.sellerCountry" }
                    },
                    // products: 1,
                    categoryLevel1: 1,
                    categoryLevel2: 1,
                    categoryLevel3: 1,


                    subscription: 1,
                    paymentMethod: 1,
                    orderItems: 1,
                    totalPrice: { $sum: "$orderItems.grandTotal" },
                    indexNo: 1,
                    //order_shipping_id: { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
                    //orderStatus: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            },

            { $match: filterSearch },
            { $match: filter },
            { $sort: { "orderShippings._id": -1 } },
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

        const orderShippingList = orderShipping.length ? orderShipping[0].paginatedResults : [];
        let totalCount = 0
        try {
            totalCount = orderShipping[0].totalCount[0].count
        } catch (err) { }

        return res.send({ totalCount: totalCount, count: orderShippingList.length, data: orderShippingList })

    } catch (error) {
        return res.status(403).send({
            message: error.message,
        });
    }
}


exports.cancelSubscription = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let checkSubscribe = await allModels.subscribeModel.findOne({
        customerId: req.userId,
        _id: req.body.subscriptionId
    })
        .populate([
            {
                path: "productVariantId",
                select: ["productVariantDetails"],
                populate: {
                    path: "sellerId", select: ["sellerDetails", "nameOfBussinessEnglish"]
                }
            }
        ])
    // console.log(req.userId);

    if (!checkSubscribe) {
        return res.status(403).send({ message: "Subscription not found" });
    }

    try {

        checkSubscribe.status = "Cancelled";
        checkSubscribe.details.push(req.body.cancelSubscriptionTapDetails);
        checkSubscribe.statusComment = req.body.statusComment;
        await checkSubscribe.save();

        let order = await allModels.orderModel.findOne({ subscriptionId: checkSubscribe._id });
        if (order) {
            let orderItem = await allModels.orderItems.findOne({ orderId: order._id });
            if (orderItem) {
                orderItem.Cancelled = true
                orderItem.CancelledComment = req.body.statusComment
                orderItem.CancelledDateTime = new Date()
                await orderItem.save();
            }
        }
        //Send Notification

        checkSubscribe.customername = req.customer.firstName
        checkSubscribe.productname = checkSubscribe.productVariantId.productVariantDetails[0].productVariantName
        checkSubscribe.subscriptionnumber = checkSubscribe.indexNo

        await sendNotification(req, null, req.userId, '10', checkSubscribe, 'cancel subscription', checkSubscribe._id)
        sendNotification(req, null, checkSubscribe.productVariantId.sellerId._id, '28', checkSubscribe, 'cancel subscription', checkSubscribe._id)

        //console.log(checkCart)
        return res.send({ data: checkSubscribe })
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.getCardList = async (req, res) => {

    let tapCustomerId = req.customer.tapCustomerId;
    const options = {
        method: 'GET',
        uri: `https://api.tap.company/v2/card/${tapCustomerId}`,
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
        }
    }

    request(options)
        .then(function (response) {
            // console.log(response);
            return res.send(response);
        }).catch(function (err) {
            return res.status(403).send(err);
        })
}

exports.addCard = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(422).send({ message: validationError.array() });
    }

    let tapCustomerId = req.customer.tapCustomerId;

    const options = {
        method: 'POST',
        uri: `https://api.tap.company/v2/tokens`,
        json: true,
        body: {
            "card": {
                "number": req.body.cardNumber,
                "exp_month": parseInt(req.body.expiryMonth),
                "exp_year": parseInt(req.body.expiryYear),
                "cvc": parseInt(req.body.cvv),
                "name": req.body.cardHolderName
            }
        },
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
        }
    }

    request(options)
        .then(function (response) {
            //varifying card
            const options1 = {
                method: 'POST',
                uri: `https://api.tap.company/v2/card/verify`,
                json: true,
                body: {
                    "currency": "BHD",
                    "threeDSecure": true,
                    "save_card": false,
                    "customer": {
                        "id": tapCustomerId
                    },
                    "source": {
                        "id": response.id
                    },
                    "redirect": {
                        "url": "http://your_website.com/redirect_url"
                    }
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
                }
            }
            request(options1)
                .then(function (response1) {
                    //adding card
                    const options2 = {
                        method: 'POST',
                        uri: `https://api.tap.company/v2/card/${tapCustomerId}`,
                        json: true,
                        body: {
                            "source": response1.source.id
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
                        }
                    }
                    request(options2)
                        .then(function (response2) {
                            return res.json(response2)
                        }).catch(function (err2) {
                            return res.status(403).json(err2)
                        })
                    //end adding card
                }).catch(function (err1) {
                    return res.status(403).json(err1);
                })
            //varifying card
            //return res.send(response);
        }).catch(function (err) {
            return res.status(403).json(err);
        })
}


exports.removeCard = async (req, res, next) => {
    let tapCustomerId = req.customer.tapCustomerId;
    let card_id = req.query.card_id
    const options = {
        method: 'DELETE',
        uri: `https://api.tap.company/v2/card/${tapCustomerId}/${card_id}`,
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
        }
    }
    request(options)
        .then(function (response) {
            return res.json(response)
        }).catch(function (err) {
            return res.status(403).json(err)
        })
}

//tap create order
exports.tapCreateOrder = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(422).send({ message: validationError.array() });
    }

    let postData = req.body.data;
    const options = {
        method: 'POST',
        uri: `https://api.tap.company/v2/orders`,
        body: postData,
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
        }
    }

    request(options)
        .then(function (response) {
            // console.log(response);
            return res.send(response);
        }).catch(function (err) {
            return res.status(403).send(err);
        })
}

//tap create subscription
exports.tapCreateSubscription = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(422).send({ message: validationError.array() });
    }

    let postData = req.body.data;
    const options = {
        method: 'POST',
        uri: `https://api.tap.company/v2/subscription/v1`,
        body: postData,
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
        }
    }

    request(options)
        .then(function (response) {
            // console.log(response);
            return res.send(response);
        }).catch(function (err) {
            return res.status(403).send(err);
        })
}

//tap cancel subscription
exports.tapCancelSubscription = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(422).send({ message: validationError.array() });
    }

    let Subscription_id = req.query.Subscription_id;
    const options = {
        method: 'DELETE',
        uri: `https://api.tap.company/v2/subscription/v1/${Subscription_id}`,
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'
        }
    }

    request(options)
        .then(function (response) {
            // console.log(response);
            return res.send(response);
        }).catch(function (err) {
            return res.status(403).send(err);
        })
}