let allModels = require("../../../utilities/allModels")
let mongoose = require("mongoose")
const { validationResult } = require('express-validator');
const { writeLog } = require("./../../utilities/log");
let { sendNotification } = require("../../../website/v1/middlewares/sendNotification");
let { receipt } = require('./../../../website/v1/middlewares/receiptTemplate');
let aramex = require('./../../middlewares/aramex');

exports.createOrder = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let reqData = req.body

    if (reqData.productVariants.length <= 0) {
        return res.status(403).send({ message: "Please enter product variant array details" });
    }
    if (typeof reqData.productVariants == "object") {//|| !f.quantity || f.shippingPrice
        let invalidPvId = reqData.productVariants.filter(f => !f.id);
        if (invalidPvId.length > 0) {
            return res.status(403).send({ message: "Please enter valid product variant id" });
        }

        let invalidPvQuantity = reqData.productVariants.filter(f => !f.quantity);
        if (invalidPvQuantity.length > 0) {
            return res.status(403).send({ message: "Please enter valid product variant quantity" });
        }

        let invalidPvShippingPrice = reqData.productVariants.filter(f => !f.shippingPrice);
        if (invalidPvShippingPrice.length > 0) {
            return res.status(403).send({ message: "Please enter valid product variant shippingPrice" });
        }
    }
    try {
        let billvalid = mongoose.Types.ObjectId.isValid(reqData.billingAddressId);
        let shipvalid = mongoose.Types.ObjectId.isValid(reqData.shippingAddressId);
        if (!billvalid || !shipvalid) {
            return res.status(402).send({ message: "Invalid billing or shipping address" });
        }

        let billing = await allModels.customerAddress.findOne({ _id: reqData.billingAddressId, customerId: req.userId })
            .select(['-__v', '-createdAt', '-updatedAt', '-isDefault', '-active'])
            .populate({ path: 'customerId', select: ["firstName", "lastName", "emailAddress", "mobilePhone"] });

        if (!billing) {
            return res.status(402).send({ message: "Billing address not found for user" });
        }

        let shipping = await allModels.customerAddress.findOne({ _id: reqData.shippingAddressId, customerId: req.userId })
            .select(['-__v', '-createdAt', '-updatedAt', '-isDefault', '-active'])
            .populate({ path: 'customerId', select: ["firstName", "lastName", "emailAddress", "mobilePhone"] });

        if (!shipping) {
            return res.status(402).send({ message: "Shipping address not found for user" });
        }

        let addressDetails = {
            billingDetails: {
                customerName: `${billing['customerId'].firstName} ${billing['customerId'].lastName}`,
                companyName: '',
                addressLine1: billing['addressLine1'],
                addressLine2: billing['addressLine2'],
                addressLine3: billing['addressLine3'],
                pincode: billing['pincode'],
                poBox: billing['poBox'] || null,
                city: billing['city'],
                state: billing['state'],
                country: billing['country'],
                contactPhone: billing['contactNumber'],
                mobilePhone: billing['customerId'].mobilePhone,
                emailAddress: billing['customerId'].emailAddress
            },
            shippingDetails: {
                customerName: `${shipping['customerId'].firstName} ${shipping['customerId'].lastName}`,
                companyName: '',
                addressLine1: shipping['addressLine1'],
                addressLine2: shipping['addressLine2'],
                addressLine3: shipping['addressLine3'],
                pincode: shipping['pincode'],
                poBox: shipping['poBox'] || null,
                city: shipping['city'],
                state: shipping['state'],
                country: shipping['country'],
                contactPhone: shipping['contactNumber'],
                mobilePhone: shipping['customerId'].mobilePhone,
                emailAddress: shipping['customerId'].emailAddress
            }
        }

        //Product variant stock check
        let pv = await allModels.productVariant.find({ _id: reqData.productVariants.map(m => m.id) })
        let isPVError = false;
        for (let pv_i = 0; pv_i < reqData.productVariants.length; pv_i++) {
            const ele = reqData.productVariants[pv_i];
            let a = pv.filter(f => f._id.toString() == ele.id.toString());

            if (a.length > 0 && (parseInt(ele.quantity)) <= parseInt(a[0].inventoryQuantity)) { }
            else {
                isPVError = true;
            }
        }

        if (isPVError) {
            return res.status(403).send({ message: "One or more product is out of stock in your cart" });
        }
        //End product variant stock check

        let lastOrderIndex = await allModels.orderModel.findOne().sort([['indexNo', '-1']]);
        if (!lastOrderIndex) { lastOrderIndex = {}; lastOrderIndex['indexNo'] = 1000 }

        let newOrder = new allModels.orderModel({
            _id: reqData.id,
            customerId: req.userId,
            deviceIdentifier: reqData.deviceIdentifier,
            customerDelhiveryDetails: addressDetails,
            paymentMethod: reqData.paymentMethod.toUpperCase(),
            payment: reqData.payment || {},
            indexNo: lastOrderIndex.indexNo + 1
        })

        req.customerAddress = addressDetails;
        let { productVariants, orderShippingList } = await this.addOrderProduct(req, reqData, newOrder);
        let orderIds = [];
        if (typeof orderShippingList == "object" && orderShippingList.length > 0) {
            orderIds = orderShippingList.map(m => `#${newOrder.indexNo}_${m.indexNo}`);
        }

        let data = {
            order: newOrder,
            orderProductVariants: productVariants,
            orderIds: orderIds
        }

        let orderData = await newOrder.save()

        let findCheckCart = await allModels.cartModel.findOne({
            "customerId": req.userId,
        });
        try {
            findCheckCart['productVariants'] = []
            await findCheckCart.save();
        } catch (error) { }

        if (orderData.paymentMethod == "MY_MARKET_WALLET") {
            try {
                //updating order IndexNo for wallet payment
                writeLog("---order data ---", orderData)
                let wallet = await allModels.walletModel.findOne({ orderId: mongoose.Types.ObjectId(orderData._id) });
                writeLog("---order wallet---", wallet)
                if (wallet) {
                    writeLog("---order data for wallet---", orderData)
                    wallet.orderIndexNo = orderData.indexNo;
                    await wallet.save()
                }
            } catch (error) {
                writeLog("---order wallet error---", error.message)
            }
        }

        let checkCart = await allModels.cartModel.findOne({
            "customerId": req.userId,
        });
        try {
            checkCart['productVariants'] = []
            await checkCart.save();
        } catch (error) { }

        /*Sending Notification*/

        var shippingPrice = 0
        for (let item of orderShippingList) { shippingPrice += item.shippingPrice }
        data.shippingPrice = shippingPrice

        data.customername = data.order.customerDelhiveryDetails.billingDetails.customerName.toUpperCase()
        data.ordernumber = data.order.indexNo
        //Customer
        await sendNotification(req, null, req.userId, '1', data, 'order', data.order._id)

        for (let orderShipping of orderShippingList) {
            let data1 = {}
            PVariant = data.orderProductVariants.filter(item => item.sellerId._id.toString() == orderShipping.sellerId._id)
            let sellerId = orderShipping.sellerId._id

            data1.shippingPrice = orderShipping.shippingPrice
            data1.ordernumber = data.order.indexNo + '_' + orderShipping.indexNo
            data1.order = data.order
            data1.customername = data.customername
            data1.PVariant = PVariant
            data1.sellername = orderShipping.sellerId.nameOfBussiness
            //console.log(data1.sellername)

            await sendNotification(req, null, sellerId, '19', data1, 'order', data.order._id)
            //Admin
            let adminId = "6167dd18bbf8c03ff43549ff"
            await sendNotification(req, null, adminId, '37', data1, 'order', data.order._id)
        }

        /*End Sending Notification*/
        return res.send({ message: "Thank you! We have received your order.", d: data });
    } catch (err) {
        return res.status(403).send({ message: err.message });
    }
}

//add order product
exports.addOrderProduct = async (req, data, order) => {
    return new Promise(async (resolve, reject) => {
        let productVariants = [];
        let orderShippingList = [];
        let orderId = order._id;

        for (let i = 0; i < data.productVariants.length; i++) {
            let pvariant = data.productVariants[i];

            let product = await allModels.productVariant.findOne({ _id: pvariant.id }).populate([{ path: "sellerId" }])

            pvariant.courierId = pvariant.orderProductStatus = pvariant.airwayBill = '';
            product.inventoryQuantity = (parseInt(product.inventoryQuantity) - (parseInt(pvariant.quantity))).toString()
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

                if (!pvariant.couponProductPrice || pvariant.couponProductPrice == null || pvariant.couponProductPrice == "") {
                    pvariant.couponProductPrice = 0
                }

                let totalDiscount = 0, offerDiscount = 0, couponDiscount = 0;

                if (parseFloat(pvariant.offerProductPrice).toString().toLowerCase() != 'nan') {
                    offerDiscount = (parseFloat(product['productNetPrice']) - parseFloat(pvariant.offerProductPrice)) * pvariant.quantity
                }

                if (parseFloat(pvariant.couponProductPrice.toString()).toString().toLowerCase() != 'nan' && parseFloat(pvariant.couponProductPrice.toString()) > 0) {
                    if (offerDiscount == 0) {
                        couponDiscount = (parseFloat(product['productNetPrice']) - parseFloat(pvariant.couponProductPrice)) * pvariant.quantity
                    } else {
                        couponDiscount = (parseFloat(pvariant.offerProductPrice) - parseFloat(pvariant.couponProductPrice)) * pvariant.quantity
                    }
                }

                totalDiscount = offerDiscount + couponDiscount;

                let totalUnitPrice = parseFloat(product['productNetPrice']) - (totalDiscount / pvariant.quantity)
                let lastOrderItemIndex = await allModels.orderItems.findOne().sort([['indexNo', '-1']]);
                if (!lastOrderItemIndex) { lastOrderItemIndex = {}; lastOrderItemIndex['indexNo'] = 1000 }

                const orderProducts = new allModels.orderItems({
                    orderId: orderId,
                    productVariantId: product._id,
                    productVariantDetails: product['productVariantDetails'],
                    productVariantImages: product['productVariantImages'],
                    sellerId: product.sellerId,
                    retailPrice: product['productNetPrice'],
                    quantity: pvariant.quantity,
                    couponItemId: pvariant.couponId,
                    couponCode: pvariant.couponCode,
                    couponDiscount: couponDiscount,
                    couponPrice: pvariant.couponProductPrice,

                    offerPrice: pvariant.offerProductPrice,
                    offerPricingItemId: pvariant.offerPricingItemId,
                    offerDiscount: offerDiscount,

                    shipment: {
                        shipmentWidth: product.shipmentWidth,
                        shipmentLength: product.shipmentLength,
                        shipmentHeight: product.shipmentHeight,
                        shipmentWeight: product.shipmentWeight,
                    },

                    totalDiscount: totalDiscount,
                    totalUnitPrice: totalUnitPrice,
                    grandTotal: totalUnitPrice * parseInt(pvariant.quantity.toString()),
                    totalTax: parseFloat(product['productTaxPrice'].toString()) * parseInt(pvariant.quantity.toString()),
                    indexNo: lastOrderItemIndex.indexNo + 1,
                    commissionPercentage: product.sellerId.commissionPercentage
                });
                await orderProducts.save();
                productVariants.push(orderProducts);

                if (!checkShiping) {
                    let lastOrderShippingIndex = await allModels.orderShippingNew.findOne().sort([['indexNo', '-1']]);
                    if (!lastOrderShippingIndex) { lastOrderShippingIndex = {}; lastOrderShippingIndex['indexNo'] = 1000 }

                    let orderShipping = await allModels.orderShippingNew({
                        orderId: orderId,
                        sellerId: product.sellerId,
                        // externalAWB: 4512,
                        shippingPrice: (pvariant['shippingPrice']) ? parseFloat((parseFloat(pvariant['shippingPrice'].toString())).toFixed(2)) : 0,
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
                writeLog("orderItemError=> ", error.message)
                console.log(error.message);
            }
            if (i == (data.productVariants.length - 1)) {
                console.log("-------------------------------------");
                //aramex shipping function call
                await aramexShippingApi(req, order, productVariants, orderShippingList);

                resolve({ productVariants: productVariants, orderShippingList: orderShippingList });
            }
        }
    });
}

const aramexShippingApi = async (customerData, orderData, orderItem, shippingData) => {
    let data = {
        shipmentIndex: null,
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
        data.shipmentIndex = element.indexNo;

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
                //console.log("..");
                //console.log(JSON.stringify(aramexShipping));
                if (aramexShipping.HasErrors == false) {
                    let shipmentData = await allModels.orderShippingNew.findOne({ indexNo: element.indexNo });
                    shipmentData.externalAWB = aramexShipping.Shipments[0].ID;
                    await shipmentData.save();
                    // console.log("----------------------------------------");
                }
            }
            //if customer and seller is from different country 
            else if (element.sellerId.sellerAddress.orderPickupAddress.companyOrderAddCountryCode.toLowerCase() != data.customer.address.country.toLowerCase()) {
                let aramexShipping = await aramex.createShipment(data, "EXP", "PPX");
                console.log("..");
                console.log(JSON.stringify(aramexShipping));
                if (aramexShipping.HasErrors == false) {
                    let shipmentData = await allModels.orderShippingNew.findOne({ indexNo: element.indexNo });
                    shipmentData.externalAWB = aramexShipping.Shipments[0].ID;
                    await shipmentData.save();
                    // console.log("----------------------------------------");
                }
            }
            // console.log("----------------------------------------", element.indexNo);

        }
    }

}

exports.fetchAllOrderByCustomerId = async (req, res) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let { limit, page, status } = req.query;
    //pagination
    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    let orderItemFilter = {}
    let statusCheck = status;

    if (status.toLowerCase() == 'new') {
        status = ["New", "Processing", "Shipped", "On_Hold"]
        status = {
            $and: [
                { orderStatus: { $in: status } },
                { orderItems: { $ne: [] } }
            ]
        }
        orderItemFilter = {
            $expr: {
                $and: [
                    { $eq: ["$orderId", "$$orderId"] },
                    { $eq: ["$sellerId", "$$sellerId"] },
                    { $eq: ["$Cancelled", false] },
                    { $eq: ["$Refunded", false] },
                    { $eq: ["$Returned", false] }
                ]
            }
        }
    } else if (status.toLowerCase() == 'delivered') {
        status = ["Delivered"]
        status = {
            $and: [
                { orderStatus: { $in: status } },
                { orderItems: { $ne: [] } }
            ]
        }
        orderItemFilter = {
            $expr: {
                $and: [
                    { $eq: ["$orderId", "$$orderId"] },
                    { $eq: ["$sellerId", "$$sellerId"] },
                    { $eq: ["$Cancelled", false] },
                    { $eq: ["$Refunded", false] },
                    { $eq: ["$Returned", false] }
                ]
            }
        }
    } else if (status.toLowerCase() == 'cancelled') {
        status = { orderItems: { $ne: [] } }
        orderItemFilter = {
            $expr: {
                $and: [
                    { $eq: ["$orderId", "$$orderId"] },
                    { $eq: ["$sellerId", "$$sellerId"] },
                    {
                        $or: [
                            { $eq: ["$Cancelled", true] },
                            { $eq: ["$Refunded", true] },
                            { $eq: ["$Returned", true] }
                        ]
                    }
                ]
            }
        }
    }

    let customer = mongoose.Types.ObjectId(req.userId);
    //const orders = await allModels.orderModel.find({ customerId: customer })

    const orderShipping = await allModels.orderModel.aggregate([
        // { $match: { "orderId": { $in: orders.map(data => data._id) } } },
        { $match: { customerId: customer } },
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
        { $addFields: { orderStatus: { $last: "$orderStatusUpdate.status" } } },
        {
            $project: {
                customer: 1,
                customerDelhiveryDetails: 1,
                orderShippings: 1,
                subscriptionId: 1,
                paymentMethod: 1,
                "order_shipping_id": { $concat: ["#", { $toString: "$indexNo" }, "_", { $toString: "$orderShippings.indexNo" }] },
                orderStatus: 1,
                createdAt: 1
            }
        },
        {
            $project: {
                'customer.createdAt': 0,
                'customer.createdDate': 0,
                'customer.defaultLanguage': 0,
                'customer.expireOtp': 0,
                'customer.facebookLoginId': 0,
                'customer.googleLoginId': 0,
                'customer.guest': 0,
                'customer.imageFile': 0,
                'customer.indexNo': 0,
                'customer.otp': 0,
                'customer.password': 0,
                'customer.referralCode': 0,
                'customer.referredBy': 0,
                'customer.resetpasswordtoken': 0,
                'customer.tapCustomerId': 0,
                'customer.updatedAt': 0,
                'customer.updatedDate': 0,
                'customer.__v': 0,
            }
        },
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
        { $match: status },
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

    let orderShippingList = orderShipping.length ? orderShipping[0].paginatedResults : [];
    if (statusCheck.toLowerCase() == 'new' || statusCheck.toLowerCase() == 'delivered') {
        orderShippingList = await generateReceipt(req, orderShippingList);
    }

    let totalCount = 0
    try {
        totalCount = orderShipping[0].totalCount[0].count
    } catch (err) { }

    return res.send({ totalCount: totalCount, count: orderShippingList.length, data: orderShippingList })
}

const generateReceipt = async (req, data) => {
    return new Promise(async (resolve, reject) => {
        for (let index = 0; index < data.length; index++) {
            let ele = data[index];
            ele = await receipt(req, ele);
        }
        resolve(data)
    })
}

exports.cancelOrder = async (req, res, next) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let _id = req.params.id;
        let order = await allModels.orderModel.findOne({ indexNo: _id.split("_")[0] });

        if (!order) {
            return res.status(403).send({ message: "Invalid order" });
        }

        let orderShipping = await allModels.orderShippingNew.findOne({
            indexNo: _id.split("_")[1]
        })
        if (!orderShipping) {
            return res.status(403).send({ message: "Unable to cancel order item. Shipping details not found" });
        }

        let orderStatus = await allModels.orderStatusUpdate.findOne({
            orderShippingId: orderShipping._id
        }).sort({ indexNo: -1 });

        //console.log(orderStatus.status);
        if (["new", "processing", "on_hold"].includes(orderStatus.status.toLowerCase())) {
            let { orderItems } = req.body;
            //console.log(order._id, orderItems);

            let orderItemList = await allModels.orderItems.find({
                orderId: order._id,
                _id: { $in: orderItems.map(row => row.id) }
            });
            let isErrorUpdate = false;
            if (orderItemList.length == 0) {
                return res.status(403).send({ message: "No Order product found by the given information!" });
            } else {
                for (let index = 0; index < orderItemList.length; index++) {
                    const ele = orderItemList[index];
                    let orderItem = await allModels.orderItems.findOne({
                        orderId: order._id,
                        _id: ele._id
                    });
                    let filter = orderItems.filter(f => f.id.toString() == ele._id.toString())
                    if (filter.length == 1) {
                        orderItem['Cancelled'] = true
                        orderItem['CancelledBy'] = 'Customer'
                        orderItem['CancelledDateTime'] = new Date()
                        orderItem['CancelledComment'] = filter[0].comment
                        await orderItem.save()

                        // check if order has single item
                        let orderproductList = await allModels.orderItems.find({ "orderId": orderItem.orderId })
                        if (orderproductList.length == 1) {
                            let orderShipping = await allModels.orderShippingNew.findOne({
                                orderId: orderItem.orderId,
                                sellerId: orderItem.sellerId
                            })
                            if (orderShipping) {
                                let lastOrderStatusIndex = await allModels.orderStatusUpdate.findOne().sort([['indexNo', '-1']]);
                                if (!lastOrderStatusIndex) { lastOrderStatusIndex = {}; lastOrderStatusIndex['indexNo'] = 1000 }

                                let shippingStatus = new allModels.orderStatusUpdate({
                                    status: "Cancelled",
                                    orderShippingId: orderShipping._id,
                                    updatedBy: "Customer",
                                    indexNo: lastOrderStatusIndex['indexNo'] + 1
                                })
                                await shippingStatus.save()

                            }
                        }
                    } else {
                        isErrorUpdate = true
                    }
                }
            }

            if (isErrorUpdate) {
                return res.send({
                    message: "Unable to cancel few items"
                })
            } else {
                data = {}
                data.customername = req.customer.firstName
                data.ordernumber = order.indexNo + '_' + orderShipping.indexNo
                data.order = order
                data.orderItemList = orderItemList
                data.CancellationReason = "Customer Cancelled"

                //Sending Notification
                sendNotification(req, null, req.userId, '4', data, 'order', data.order._id)
                sendNotification(req, null, orderShipping.sellerId, '21', data, 'order', data.order._id)
                return res.send({
                    message: "Your order item has been cancelled successfully"
                })
            }
        } else {
            return res.status(403).send({ message: `Unable to cancel order item. Order status ${orderStatus.status.replace(/_/, " ")}` });
        }
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.returnOrderItem = async (req, res, next) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let _id = req.params.id;
        let order = await allModels.orderModel.findOne({ indexNo: _id.split("_")[0] });

        if (!order) {
            return res.status(403).send({ message: "Invalid order" });
        }

        let orderShipping = await allModels.orderShippingNew.findOne({
            indexNo: _id.split("_")[1]
        })
        if (!orderShipping) {
            return res.status(403).send({ message: "Unable to return order item. Shipping details not found" });
        }

        let orderStatus = await allModels.orderStatusUpdate.findOne({
            orderShippingId: orderShipping._id
        }).sort({ indexNo: -1 });

        // console.log(orderStatus.status);
        if (["delivered"].includes(orderStatus.status.toLowerCase())) {
            let { orderItems } = req.body;
            //console.log(order._id, orderItems);

            let orderItemList = await allModels.orderItems.find({
                orderId: order._id,
                _id: { $in: orderItems.map(row => row.id) }
            });
            let isErrorUpdate = false;
            if (orderItemList.length == 0) {
                return res.status(403).send({ message: "No Order product found by the given information!" });
            } else {
                for (let index = 0; index < orderItemList.length; index++) {
                    const ele = orderItemList[index];
                    let orderItem = await allModels.orderItems.findOne({
                        orderId: order._id,
                        _id: ele._id
                    });
                    let filter = orderItems.filter(f => f.id.toString() == ele._id.toString())
                    if (filter.length == 1) {
                        orderItem['Returned'] = true
                        orderItem['ReturnedComment'] = filter[0].comment
                        orderItem['ReturnedDateTime'] = new Date()
                        await orderItem.save()
                    } else {
                        isErrorUpdate = true
                    }
                }
            }

            if (isErrorUpdate) {
                return res.send({
                    message: "Unable to return few items"
                })
            } else {
                return res.send({
                    message: "Your order item has been returned successfully"
                })
            }
        } else {
            return res.status(403).send({ message: `Unable to return order item. Order status ${orderStatus.status.replace(/_/, " ")}` });
        }
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.orderStatusTracking = async (req, res) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let _id = req.query.id;
        let order = await allModels.orderModel.findOne({ indexNo: _id.split("_")[0] });

        if (!order) {
            return res.status(403).send({ message: "Invalid order" });
        }

        let orderShipping = await allModels.orderShippingNew.findOne({
            indexNo: _id.split("_")[1]
        })
        if (!orderShipping) {
            return res.status(403).send({ message: "Unable to return order item. Shipping details not found" });
        }

        let orderStatus = await allModels.orderStatusUpdate.find({
            orderShippingId: orderShipping._id
        }).select(["-__v", "-createdDate", "-updatedDate", "-statusUpdatedate", "-orderShippingId"])
        //.sort({ indexNo: -1 });

        return res.send({ data: orderStatus })
    } catch (error) {
        return res.status(403).send({ message: error.message })
    }
}

exports.generateId = async (req, res) => {
    const id = mongoose.Types.ObjectId();
    return res.send({
        id: id
    });
}

exports.orderProduct = async (req, res) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        let orderShippingIndex = req.query.orderId.split("_");
        /* var valid = mongoose.Types.ObjectId.isValid(orderId);
        if (!valid) {
            return res.status(402).send({ message: "No Order found by the given information!" });
        } */
        let order = await allModels.orderModel.findOne({ indexNo: orderShippingIndex[0] })
        let shipping = await allModels.orderShippingNew.findOne({ indexNo: orderShippingIndex[1] })

        if (order && shipping) {
            //console.log(order._id, shipping._id, shipping.sellerId);
            let orderProduct = await allModels.orderItems.find({ orderId: order._id, sellerId: shipping.sellerId })
            // .select(["-productVariantId"])
            return res.send({ count: orderProduct.length, d: orderProduct })
        } else {
            return res.status(403).send({ message: "Invalid order id" });
        }
    }

    catch (error) {
        return res.status(500).send({ message: error.message })
    }
}