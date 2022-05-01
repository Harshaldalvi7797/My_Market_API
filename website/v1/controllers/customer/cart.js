var allModels = require('../../../../utilities/allModels');
let mongoose = require("mongoose")
exports.addUpdateCart = async (req, res) => {

    let reqData = req.body;
    let productVariant = await allModels.productVariant.findById(reqData.productVariantId);

    if (!productVariant) { return res.status(403).send({ message: "Invalid product variant id selected" }); }
    let checkCart = null;
    if (!req.userId) {
        checkCart = await allModels.cartModel.findOne({
            deviceIdentifier: reqData.deviceIdentifier
        });
    } else {
        checkCart = await allModels.cartModel.findOne({
            customerId: req.userId
        })
    }
    if (reqData.quantity < 0) {
        reqData.quantity = 0;
    }

    //console.log(req.userId);
    if (!checkCart) {
        let cart = await new allModels.cartModel({
            customerId: req.userId || null,
            productVariants: { productVariantId: productVariant._id, quantity: reqData.quantity },
            status: 0,
            deviceIdentifier: (req.userId) ? null : reqData.deviceIdentifier
        })
        let data = await cart.save()

        return res.status(200).send({ message: "Product added to cart!", data: data })
    }
    else {
        let findData = await checkCart['productVariants'];
        let a = await findData.findIndex(x => x.productVariantId.toString() === productVariant._id.toString());
        
        //console.log(a)
        if (a != -1) {
            checkCart['productVariants'][a].quantity = (reqData.quantity ? parseInt(reqData.quantity) : checkCart['productVariants'][a].quantity + 1);
        } else {
            await checkCart['productVariants'].push({ productVariantId: productVariant._id, quantity: reqData.quantity });
        }

        // console.log(checkCart['productVariants'][a]);
        checkCart['customerId'] = req.userId || checkCart['customerId'] || null
        checkCart['deviceIdentifier'] = (!req.userId) ? checkCart['deviceIdentifier'] : null

        await checkCart.save();
        return res.status(200).send({ message: "Product added to cart!", data: checkCart })
    }
}

exports.deleteCartItem = async (req, res) => {
    let checkCart = null;
    if (!req.userId) {
        checkCart = await allModels.cartModel.findOne({
            deviceIdentifier: req.params.deviceIdentifier
        }).select(["-__v", "-createdAt", "-updatedAt", "-status"]);
    } else {
        checkCart = await allModels.cartModel.findOne({
            customerId: req.userId
        }).select(["-__v", "-createdAt", "-updatedAt", "-status"]);
    }
    if (!checkCart) {
        return res.send({ message: 'Your cart is empty' });
    }
    let findData = await checkCart['productVariants'];
    let a = await findData.findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());
    if (a != -1) {
        checkCart['productVariants'].splice(a, 1);
        await checkCart.save();
    }
    return res.send({ message: "Product remove from cart successfully!", itemcount: checkCart['productVariants'].length, data: checkCart })
}

exports.getCart = async (req, res) => {
    let checkCart = null;
    if (!req.userId) {
        checkCart = await allModels.cartModel.findOne({
            deviceIdentifier: req.params.deviceIdentifier
        }).populate({
            path: 'productVariants.productVariantId',
            select: ["-updatedAt", "-createdAt", "-active", "-shipmentWeight", "-shipmentHeight", "-shipmentLength", "-shipmentWidth"],
            populate: [
                {
                    path: 'brandId',
                    select: ["_id", "brandDetails"]
                }
            ]
        }).select(["-__v", "-createdAt", "-updatedAt", "-status"]).lean()
        //console.log(checkCart)
    } else {
        //console.log(req.userId);
        checkCart = await allModels.cartModel.findOne({
            customerId: req.userId,
        }).populate({
            path: 'productVariants.productVariantId',
            match: { "productVariants.productVariantId": null },
            select: ["-updatedAt", "-createdAt", "-active", "-shipmentWeight", "-shipmentHeight", "-shipmentLength", "-shipmentWidth"],
            populate: [
                {
                    path: 'brandId',
                    select: ["_id", "brandDetails"]
                }
            ]
        }).select(["-__v", "-createdAt", "-updatedAt", "-status"]).lean();

    }

    if (!checkCart) {
        return res.send({ message: 'Your cart is empty' });
    }

    checkCart.productVariants = checkCart.productVariants.filter(f => f.productVariantId != null);
    const today = new Date();
    // today.setHours(0);
    // today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    for (let index = 0; index < checkCart.productVariants.length; index++) {
        if (checkCart.productVariants[index].productVariantId) {
            const element = checkCart.productVariants[index].productVariantId._id;
            // console.log(element)

            let checkoffer = await allModels.offerPricingItem
                .find({ productVariantId: element, active: true });

            let datetime = convertDateTime(today);

            if (checkoffer.length > 0) {
                let offer = await allModels.offerPricing
                    .findOne({
                        _id: { $in: checkoffer.map(data => data.offerpricingId) },
                        active: true,
                        startDate: { $lt: datetime },
                        endDate: { $gt: datetime },
                    });
                //console.log((checkoffer.length>1)?checkoffer[1].offerpricingId:null, datetime);

                if (!offer) {
                    checkoffer = null
                } else {
                    let a = await checkoffer.findIndex(x => x.offerpricingId.toString() === offer._id.toString());
                    checkoffer = {
                        "discountType": checkoffer[a].discountType,
                        "discountValue": checkoffer[a].discountValue,
                        "offerPrice": checkoffer[a].offerPrice,
                        "_id": checkoffer[a]._id
                    }
                }
                checkCart.productVariants[index].offerPrice = checkoffer
            } else {
                checkCart.productVariants[index].offerPrice = null
            }
        }
    }
    //console.log(checkCart)
    return res.send({ itemcount: checkCart['productVariants'].length, data: checkCart })
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