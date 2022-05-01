var allModels = require('../../utilities/allModels');
let mongoose = require("mongoose")
const { validationResult } = require('express-validator');
const { writeLog } = require("./../../utilities/log");
let { sendNotification } = require("../../../website/v1/middlewares/sendNotification");
let aramex = require('../../../website/v1/middlewares/aramex');


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
        })

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

        let lastOrderIndex = await allModels.order.findOne().sort([['indexNo', '-1']]);
        if (!lastOrderIndex) { lastOrderIndex = {}; lastOrderIndex['indexNo'] = 1000 }

        let newOrder = new allModels.order({
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

        data.customername = req.customer.firstName
        data.productname = productVariant.productVariantDetails[0].productVariantName
        data.productVariant = productVariant
        data.subscriptionnumber = subscribeP.indexNo
        data.subscription = subscribeP

        sendNotification(req, null, req.userId, '8', data, 'subscribe', data._id)
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

exports.getAllSubscription = async (req, res) => {
    let checkSubscribe = null;


    let status = req.params.status
    let filter = {
        customerId: req.userId
    }
    if (status) {
        filter["status"] = status;
    }

    checkSubscribe = await allModels.subscribeModel.find(filter)
        .select(["-__v", "-createdAt", "-updatedAt", "-status"])
        .sort([["indexNo", "-1"]]);


    if (!checkSubscribe) {
        return res.send({ message: "You haven't subscribe any product" });
    }

    //console.log(checkCart)
    return res.send({ count: checkSubscribe.length, data: checkSubscribe })
}


exports.getSubscribe = async (req, res) => {
    let checkSubscribe = null;


    checkSubscribe = await allModels.subscribeModel.find({
        customerId: req.userId,
        status: "Active"
    }).select(["productVariantId"]);

    if (!checkSubscribe) {
        return res.send({ message: "You haven't subscribe any product" });
    }

    //console.log(checkCart)
    return res.send({ count: checkSubscribe.length, data: checkSubscribe })
}

exports.cancelSubscription = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let checkSubscribe = await allModels.subscribeModel.findOne({
        customerId: req.userId,
        _id: req.body.subscriptionId
    });
    // console.log(req.userId);

    if (!checkSubscribe) {
        return res.status(403).send({ message: "Subscription not found" });
    }

    try {

        checkSubscribe.status = "Cancelled";
        checkSubscribe.details.push(req.body.cancelSubscriptionTapDetails);
        checkSubscribe.statusComment = req.body.statusComment;
        await checkSubscribe.save();

        let order = await allModels.order.findOne({ subscriptionId: checkSubscribe._id });
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
        //Finding details
        let subscribe = await allModels.subscribeModel.aggregate([
            {
                $match: {
                    customerId: mongoose.Types.ObjectId(req.userId),
                    _id: mongoose.Types.ObjectId(req.body.subscriptionId)
                }
            },
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "pv",
                },
            }
        ]);
        //End Finding details
        //return res.json(subscribe)
        subscribe.customername = req.customer.firstName
        subscribe.productname = subscribe[0].pv[0].productVariantDetails[0].productVariantName
        subscribe.subscriptionnumber = subscribe[0]._id
        let sellerId = subscribe[0].pv[0].sellerId

        sendNotification(req, null, req.userId, '10', subscribe, 'cancel subscription', subscribe._id)
        sendNotification(req, null, sellerId, '28', subscribe, 'cancel subscription', subscribe._id)

        //console.log(checkCart)
        return res.send({ data: checkSubscribe })
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

}