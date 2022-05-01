var allModels = require('../../utilities/allModels');
let aramex = require("./../../middlewares/aramex");
const { validationResult } = require("express-validator");

exports.checkout = async (req, res) => {

    const { shippingAddressId, couponCode, billingAddressId } = req.body;

    // console.log(req.userId)

    const customerAddress = await allModels.customerAddress.findOne({
        _id: shippingAddressId,
        customerId: req.userId
    });

    const billingAddress = await allModels.customerAddress.findOne({
        _id: billingAddressId,
        customerId: req.userId
    });

    if (!customerAddress || !billingAddress) {
        return res.status(403).send({ message: "Invalid customer billing/shipping address selected" });
    }

    //check coupon code valid or not if not valid then throw error invalid 
    if (couponCode) {
        let checkcoupon = await checkCoupon(couponCode)
        if (!checkcoupon) {
            return res.send({ message: "Coupon code not match" })
        }
    }

    let cart = await allModels.cartModel.findOne({ customerId: req.userId });
    let pvSeller = [];
    for (let index = 0; index < cart.productVariants.length; index++) {
        const element = cart.productVariants[index];

        let pv = await allModels.productVariant.findOne({ _id: element.productVariantId })
            .select(["sellerId", "shipmentWidth", "shipmentLength", "productNetPrice", "shipmentHeight", "shipmentWeight", "additionalCod", "domesticShippingPrice", "internationalShippingPrice"])

        if (pv) {
            element['productVariantSoldAmount'] = pv['productNetPrice'];
            element['productNetPrice'] = pv['productNetPrice'];
            //console.log(element['productVariantSoldAmount']);
            //check  coupon code for perticular product if applicabele then 
            if (couponCode) {
                let checkProductCoupon = await checkproductCoupon(pv, couponCode)
                if (checkProductCoupon) {
                    // console.log("checkProductCoupon",checkProductCoupon)
                    element['couponAmount'] = checkProductCoupon['discountAmount'];
                    element['productVariantSoldAmount'] = (parseFloat(element['productVariantSoldAmount']) - parseFloat(element['couponAmount'])).toFixed(2)
                    if (element['productVariantSoldAmount'] <= 0) {
                        element['productVariantSoldAmount'] = pv['productNetPrice'];
                        delete element['couponAmount'];
                    }
                }
            }

            let checkProductOffer = await checkproductOffer(pv)
            if (checkProductOffer) {
                element['offerAmount'] = checkProductOffer.offerPriceAmount
                let soldAmt = (parseFloat(element['productVariantSoldAmount']) - parseFloat(element['offerAmount'])).toFixed(2)

                // console.log(soldAmt);
                if (soldAmt <= 0) {
                    element['productVariantSoldAmount'] = element['productVariantSoldAmount'];
                    delete element['offerAmount'];
                } else {
                    element['productVariantSoldAmount'] = soldAmt;
                }
            } else {
                delete element['offerAmount'];
            }

            //check offer for product
            element['quantity'] = cart.productVariants[index].quantity;
            element["shipment"] = {}
            element["shipment"]["Width"] = pv["shipmentWidth"]
            element["shipment"]["Length"] = pv["shipmentLength"]
            element["shipment"]["Height"] = pv["shipmentHeight"]
            element["shipment"]["Weight"] = pv["shipmentWeight"]

            let seller = await allModels.seller.findOne({ _id: pv.sellerId })
                .select(["sellerAddress", "deliveryMethod"])

            if (seller && seller['deliveryMethod'].toLowerCase() == "self delivery") {
                element["deliveryCharges"] = {};
                element["deliveryCharges"]["additionalCod"] = pv["additionalCod"]
                element["deliveryCharges"]["domesticShippingPrice"] = pv["domesticShippingPrice"]
                element["deliveryCharges"]["internationalShippingPrice"] = pv["internationalShippingPrice"]
            }

            let isSeller = pvSeller.filter(f => f.sellerId.toString() == pv.sellerId.toString())
            if (isSeller.length == 0) {
                pvSeller.push({
                    sellerId: pv.sellerId,
                    sellerAddress: seller.sellerAddress,
                    deliveryMethod: seller.deliveryMethod,
                    pv: [element]
                })
            } else {
                let a = await pvSeller.findIndex(x => x.sellerId.toString() === pv.sellerId.toString());
                //
                pvSeller[a].pv.push(element);
            }
        }
    }

    for (let index = 0; index < pvSeller.length; index++) {
        const ele = pvSeller[index];
        //ele.customer = { shippingAddress: customerAddress }//, billingAddress: billingAddress
        let sAddress = ele.sellerAddress.orderPickupAddress;

        let totalShipment = {
            Length: 0.0,
            Width: 0.0,
            Height: 0.0
        }
        let totalWeight = 0.0;

        // console.log("=", ele.pv.length);
        ele['totalDeliveryAmount'] = 0;
        ele['CODAmount'] = 0;
        for (let i = 0; i < ele.pv.length; i++) {
            const element = ele.pv[i];

            try {
                //console.log(sAddress.companyOrderCountry.toLowerCase(), customerAddress.country.toLowerCase())
                //same country delivery for self delivery
                if (ele.deliveryMethod.toLowerCase() == "self delivery" && sAddress.companyOrderAddCountryCode.toLowerCase() == customerAddress.country.toLowerCase()) {
                    ele['totalDeliveryAmount'] = ele['totalDeliveryAmount'] + parseFloat(element.deliveryCharges.domesticShippingPrice)
                    ele['CODAmount'] = ele['CODAmount'] + parseFloat(element.deliveryCharges.additionalCod);
                }
                //different country delivery for self delivery
                else if (ele.deliveryMethod.toLowerCase() == "self delivery" && sAddress.companyOrderAddCountryCode.toLowerCase() != customerAddress.country.toLowerCase()) {
                    ele['totalDeliveryAmount'] = ele['totalDeliveryAmount'] + parseFloat(element.deliveryCharges.internationalShippingPrice)
                    ele['CODAmount'] = ele['CODAmount'] + parseFloat(element.deliveryCharges.additionalCod);
                }

                if (parseFloat(element.shipment.Length.toString()).toString().toLowerCase() != 'nan') {
                    totalShipment.Length = totalShipment.Length + parseFloat(element.shipment.Length)
                }
                if (parseFloat(element.shipment.Width.toString()).toString().toLowerCase() != 'nan') {
                    totalShipment.Width = totalShipment.Width + parseFloat(element.shipment.Width)
                }
                if (parseFloat(element.shipment.Height.toString()).toString().toLowerCase() != 'nan') {
                    totalShipment.Height = totalShipment.Height + parseFloat(element.shipment.Height)
                }
                if (parseFloat(element.shipment.Weight.toString()).toString().toLowerCase() != 'nan') {
                    totalWeight = totalWeight + parseFloat(element.shipment.Weight)
                }

                // console.log(ele['totalDeliveryAmount']);
            } catch (error) {
                console.log(error.message)
            }
        }

        try {
            //console.log(ele.deliveryMethod.toLowerCase(), sAddress.companyOrderAddCountryCode.toLowerCase(), customerAddress.country.toLowerCase())
            let data = {
                seller: await allModels.seller.findOne({ _id: ele.sellerId }),
                customer: { address: customerAddress },
                shippingDimensions: totalShipment,
                shippingActualWeight: totalWeight
            }
            ///same country delivery for mm drive
            if (ele.deliveryMethod.toLowerCase() == "mm drive" && sAddress.companyOrderAddCountryCode.toLowerCase() == customerAddress.country.toLowerCase()) {
                let deliveryCharges = await aramex.calculateRate(data);
                if (!deliveryCharges.HasErrors) {
                    ele['totalDeliveryAmount'] = deliveryCharges.TotalAmount.Value;
                } else {
                    return res.status(403).send({ message: "Customer or Seller address invalid", data: deliveryCharges.Notifications.Notification[0] });
                }
                // console.log(JSON.stringify(deliveryCharges));
            }
            //different country delivery for mm drive (aramex)
            else if (ele.deliveryMethod.toLowerCase() == "mm drive" && sAddress.companyOrderAddCountryCode.toLowerCase() != customerAddress.country.toLowerCase()) {
                let deliveryCharges = await aramex.calculateRate(data, "EXP", "PPX");
                if (!deliveryCharges.HasErrors) {
                    ele['totalDeliveryAmount'] = deliveryCharges.TotalAmount.Value;
                } else {
                    return res.status(403).send({ message: "Customer or Seller address invalid", data: deliveryCharges.Notifications.Notification[0] });
                }
                // console.log(JSON.stringify(deliveryCharges));
            }
        } catch (err) {
            return res.status(402).send({ message: err.message });
        }
    }

    let checkout = new allModels.checkoutModel({
        customerId: req.userId,
        order: pvSeller
    })
    await checkout.save()
    return res.send({
        d: pvSeller
    })
}

exports.subscriptionCheckout = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const { shippingAddressId, quantity, productVariantId, billingAddressId } = req.body;

    // console.log(req.userId)

    const customerAddress = await allModels.customerAddress.findOne({
        _id: shippingAddressId,
        customerId: req.userId
    });

    const billingAddress = await allModels.customerAddress.findOne({
        _id: billingAddressId,
        customerId: req.userId
    });

    if (!customerAddress || !billingAddress) {
        return res.status(403).send({ message: "Invalid customer billing/shipping address selected" });
    }

    let pvSeller = [];
    // for (let index = 0; index < cart.productVariants.length; index++) {
    let element = {
        productVariantId: productVariantId
    };

    let pv = await allModels.productVariant.findOne({ _id: productVariantId })
    /* .select(["sellerId", "shipmentWidth", "shipmentLength", "productNetPrice", "shipmentHeight", "shipmentWeight", "additionalCod", "domesticShippingPrice", "internationalShippingPrice", "subscriptionPrice"]) */

    if (pv) {
        element['productVariantSoldAmount'] = pv['subscriptionPrice'];
        element['productNetPrice'] = pv['productNetPrice'];
        //console.log(element['productVariantSoldAmount']);
        //check  coupon code for perticular product if applicabele then 


        //check offer for product
        element['quantity'] = quantity;
        element["shipment"] = {}
        element["shipment"]["Width"] = pv["shipmentWidth"]
        element["shipment"]["Length"] = pv["shipmentLength"]
        element["shipment"]["Height"] = pv["shipmentHeight"]
        element["shipment"]["Weight"] = pv["shipmentWeight"]

        let seller = await allModels.seller.findOne({ _id: pv.sellerId })
            .select(["sellerAddress", "deliveryMethod"])

        if (seller && seller['deliveryMethod'].toLowerCase() == "self delivery") {
            element["deliveryCharges"] = {};
            element["deliveryCharges"]["additionalCod"] = pv["additionalCod"]
            element["deliveryCharges"]["domesticShippingPrice"] = pv["domesticShippingPrice"]
            element["deliveryCharges"]["internationalShippingPrice"] = pv["internationalShippingPrice"]
        }

        let isSeller = pvSeller.filter(f => f.sellerId.toString() == pv.sellerId.toString())
        if (isSeller.length == 0) {
            pvSeller.push({
                sellerId: pv.sellerId,
                sellerAddress: seller.sellerAddress,
                deliveryMethod: seller.deliveryMethod,
                pv: [element]
            })
        } else {
            let a = await pvSeller.findIndex(x => x.sellerId.toString() === pv.sellerId.toString());
            //
            pvSeller[a].pv.push(element);
        }
    }
    // }

    for (let index = 0; index < pvSeller.length; index++) {
        const ele = pvSeller[index];
        //ele.customer = { shippingAddress: customerAddress }//, billingAddress: billingAddress
        let sAddress = ele.sellerAddress.orderPickupAddress;

        let totalShipment = {
            Length: 0.0,
            Width: 0.0,
            Height: 0.0
        }
        let totalWeight = 0.0;

        ele['totalDeliveryAmount'] = 0;
        for (let i = 0; i < ele.pv.length; i++) {
            const element = ele.pv[i];

            try {
                //same country delivery for self delivery
                if (ele.deliveryMethod.toLowerCase() == "self delivery" && sAddress.companyOrderAddCountryCode.toLowerCase() == customerAddress.country.toLowerCase()) {
                    ele['totalDeliveryAmount'] = ele['totalDeliveryAmount'] + parseFloat(element.deliveryCharges.additionalCod) + parseFloat(element.deliveryCharges.domesticShippingPrice)
                }
                //different country delivery for self delivery
                else if (ele.deliveryMethod.toLowerCase() == "self delivery" && sAddress.companyOrderAddCountryCode.toLowerCase() != customerAddress.country.toLowerCase()) {
                    ele['totalDeliveryAmount'] = ele['totalDeliveryAmount'] + parseFloat(element.deliveryCharges.additionalCod) + parseFloat(element.deliveryCharges.internationalShippingPrice)
                }

                if (parseFloat(element.shipment.Length.toString()).toString().toLowerCase() != 'nan') {
                    totalShipment.Length = totalShipment.Length + parseFloat(element.shipment.Length)
                }
                if (parseFloat(element.shipment.Width.toString()).toString().toLowerCase() != 'nan') {
                    totalShipment.Width = totalShipment.Width + parseFloat(element.shipment.Width)
                }
                if (parseFloat(element.shipment.Height.toString()).toString().toLowerCase() != 'nan') {
                    totalShipment.Height = totalShipment.Height + parseFloat(element.shipment.Height)
                }
                if (parseFloat(element.shipment.Weight.toString()).toString().toLowerCase() != 'nan') {
                    totalWeight = totalWeight + parseFloat(element.shipment.Weight)
                }

                // console.log(ele['totalDeliveryAmount']);
            } catch (error) {
                console.log(error.message)
            }
        }

        try {
            //console.log(ele.deliveryMethod.toLowerCase(), sAddress.companyOrderAddCountryCode.toLowerCase(), customerAddress.country.toLowerCase())
            let data = {
                seller: await allModels.seller.findOne({ _id: ele.sellerId }),
                customer: { address: customerAddress },
                shippingDimensions: totalShipment,
                shippingActualWeight: totalWeight
            }
            ///same country delivery for mm drive
            if (ele.deliveryMethod.toLowerCase() == "mm drive" && sAddress.companyOrderAddCountryCode.toLowerCase() == customerAddress.country.toLowerCase()) {
                let deliveryCharges = await aramex.calculateRate(data);
                if (!deliveryCharges.HasErrors) {
                    ele['totalDeliveryAmount'] = deliveryCharges.TotalAmount.Value;
                } else {
                    return res.status(403).send({ message: "Customer or Seller address invalid", data: deliveryCharges.Notifications.Notification[0] });
                }
                // console.log(JSON.stringify(deliveryCharges));
            }
            //different country delivery for mm drive (aramex)
            else if (ele.deliveryMethod.toLowerCase() == "mm drive" && sAddress.companyOrderAddCountryCode.toLowerCase() != customerAddress.country.toLowerCase()) {
                let deliveryCharges = await aramex.calculateRate(data, "EXP", "PPX");
                if (!deliveryCharges.HasErrors) {
                    ele['totalDeliveryAmount'] = deliveryCharges.TotalAmount.Value;
                } else {
                    return res.status(403).send({ message: "Customer or Seller address invalid", data: deliveryCharges.Notifications.Notification[0] });
                }
                // console.log(JSON.stringify(deliveryCharges));
            }
        } catch (err) {
            return res.status(402).send({ message: err.message });
        }
    }

    let checkout = new allModels.checkoutModel({
        customerId: req.userId,
        order: pvSeller
    })
    await checkout.save()
    return res.send({
        d: pvSeller
    })
}

const checkCoupon = async (couponCode) => {
    //console.log(couponCode)
    let coupon = await allModels.couponModel.findOne({ couponCode: couponCode, active: true })

    if (coupon) {
        return true
    }
    else {
        return false
    }
}

const checkproductCoupon = async (pv, couponCode) => {

    let coupon = await allModels.couponModel.findOne({ couponCode: couponCode, active: true })
    if (!coupon) {
        return false;
    }

    let checkCouponItem = await allModels.couponItemModel.findOne({
        productVariantId: pv._id,
        couponId: coupon._id,
        active: true
    })

    if (!checkCouponItem) {
        return false;
    }
    return checkCouponItem;
}

const checkproductOffer = async (pv) => {
    // console.log("offer pv", pv)

    let checkOfferItem = await allModels.offerPricingItem.findOne({ "productVariantId": pv._id, active: true })

    if (!checkOfferItem) {
        return false;
    }
    const today = new Date();
    today.setSeconds(0);
    today.setMilliseconds(0);

    let datetime = convertDateTime(today);
    let checkOffer = await allModels.offerPricing.findOne({
        _id: checkOfferItem.offerpricingId,
        active: true,
        startDate: { $lte: datetime },
        endDate: { $gte: datetime },
    });
    if (!checkOffer) {
        return false;
    }
    return checkOfferItem;

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