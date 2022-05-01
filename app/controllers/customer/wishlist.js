var allModels = require('../../utilities/allModels');
let mongoose = require("mongoose")
let { getRating } = require("../../../common/productVariantReview")
const { validationResult } = require('express-validator');

exports.addWishlist = async (req, res) => {
    let reqData = req.body;
    let productVariant = await allModels.productVariant.findById(reqData.productVariantId);

    if (!productVariant) { return res.status(403).send({ message: "Invalid product variant id selected" }); }
    let checkWishlist = null;

    checkWishlist = await allModels.wishlistModel.findOne({
        customerId: req.userId
    })

    //console.log('wishlist: ',JSON.stringify(checkWishlist));

    if (!checkWishlist) {
        let wishlist = new allModels.wishlistModel({
            customerId: req.userId || null,
            productVariants: { productVariantId: productVariant._id, quantity: reqData.quantity },
            status: 0,
            deviceIdentifier: reqData.deviceIdentifier
        })
        let data = await wishlist.save()

        return res.status(200).send({ message: "Product added to wishlist", data: data })
    } else {
        let findData = await checkWishlist['productVariants'];
        let a = await findData.findIndex(x => x.productVariantId.toString() === productVariant._id.toString());

        if (a == -1) {
            checkWishlist['productVariants'].push({ productVariantId: productVariant._id });
            await checkWishlist.save();
            return res.status(200).send({ message: "Product added to wishlist", data: checkWishlist });
        } else {
            return res.send({ message: "Product already added to wishlist" });
        }
    }

}

exports.removeWishlist = async (req, res) => {
    let checkWishlist = null;
    // if (!req.userId) {
    //     checkWishlist = await allModels.wishlistModel.findOne({
    //         deviceIdentifier: req.params.deviceIdentifier
    //     }).select(["-__v", "-createdAt", "-updatedAt", "-status"]);
    // } else {
    checkWishlist = await allModels.wishlistModel.findOne({

        customerId: req.userId
    }).select(["-__v", "-createdAt", "-updatedAt", "-status"]);
    //}

    if (!checkWishlist) {
        return res.status(204).send({ message: 'Your wishlist  is empty' });
    }

    let findData = await checkWishlist['productVariants'];
    //console.log(findData)
    let a = await findData.findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

    if (a != -1) {
        checkWishlist['productVariants'].splice(a, 1);
        await checkWishlist.save();
    }


    return res.status(200).send({ message: "Product removed from wishlist", itemcount: checkWishlist['productVariants'].length, data: checkWishlist })


}

exports.getWishlist = async (req, res) => {
    let checkWishlist = null;

    checkWishlist = await allModels.wishlistModel.findOne({
        customerId: req.userId
    }).populate({
        path: 'productVariants.productVariantId',
        select: ["-updatedAt", "-createdAt", "-active", "-shipmentWeight", "-shipmentHeight", "-shipmentLength", "-shipmentWidth", "-subscription"],
        populate: [
            {
                path: 'brandId',
                select: ["_id", "brandDetails"]
            },
            {
                path: 'sellerId',
                select: ["_id", "nameOfBussinessEnglish"]
            }
        ]
    }).select(["-__v", "-createdAt", "-updatedAt", "-status"]).lean()

    //console.log('-----', checkWishlist);
    try {
        if (!checkWishlist) {
            checkWishlist = {
                _id: "",
                productVariants: []
            }
            return res.status(200).send({ message: "Your Wishlist is empty!", count: 0, d: checkWishlist });
        }
        if (checkWishlist['productVariants'] == "") {
            checkWishlist = {
                _id: "",
                productVariants: []
            }
            return res.status(204).send({ message: "Your Wishlist is empty!", count: 0, d: checkWishlist });
        }

        let b = checkWishlist['productVariants'].filter(a => {
            //console.log(JSON.stringify(a['productVariantId']['sellerId']), '\n');
            return a['productVariantId'] && a['productVariantId']['sellerId'] != null;
        });

        //console.log('checkpoint 1', JSON.stringify(b), checkWishlist['productVariants'].length);
        let temp = [];
        if (b.length > 0) {
            await getRating(b, temp, true);
            //console.log('checkpoint 2');
            checkWishlist['productVariants'] = temp
            // return res.send({ count: checkWishlist['productVariants'].length, d: checkWishlist })
        }
        for (let index = 0; index < checkWishlist.productVariants.length; index++) {
            const element = checkWishlist.productVariants[index].productVariantId._id;
            //console.log(element)
            let offer = await allModels.offerPricingItem.findOne({ "productVariantId": element })
                .select(["offerpricingId", "offerPrice", "discount", "discountType", "discountValue"])
            //console.log(offer)
            if (offer) {
                const today = new Date();
                today.setHours(0);
                today.setMinutes(0);
                today.setSeconds(0);
                today.setMilliseconds(0);
                let datetime = convertDateTime(today);

                //console.log(offer.offerpricingId)
                let checkoffer = await allModels.offerPricing
                    .findOne({
                        _id: offer.offerpricingId,
                        startDate: { $lt: datetime },
                        endDate: { $gt: datetime },
                    });
                if (!checkoffer) {
                    offer = null
                } else {
                    offer = {
                        discountType: offer.discountType,
                        discountValue: offer.discountValue,
                        offerPrice: offer.offerPrice
                    }
                }
                checkWishlist.productVariants[index].offerPrice = offer
            } else {
                checkWishlist.productVariants[index].offerPrice = null
            }
        }

        return res.status(200).send({ count: checkWishlist['productVariants'].length, d: checkWishlist })

    } catch (error) {
        return res.send({ message: error.message });
    }


    // res.send({ itemcount: checkWishlist['productVariants'].length, data: checkWishlist })
}

exports.moveToCart = async (req, res) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let checkWishlist = await allModels.wishlistModel.findOne({ customerId: req.userId })
        .select(["productVariants.productVariantId"])

    if (checkWishlist) {

        let findData = await checkWishlist['productVariants'];
        let a = await findData.findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

        if (a != -1) {
            let checkCart = await allModels.cartModel.findOne({
                customerId: req.userId
            });

            checkWishlist['productVariants'].splice(a, 1);
            await checkWishlist.save();

            if (!checkCart) {
                let cart = new allModels.cartModel({
                    customerId: req.userId,
                    productVariants: { productVariantId: req.body.productVariantId },
                    deviceIdentifier: req.body.deviceIdentifier
                })
                let data = await cart.save()
                return res.status(200).send({ message: "Product add to cart", data: data });
            } else {
                let b = await checkCart['productVariants'].findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

                if (b == -1) {
                    await checkWishlist['productVariants'].push({ productVariantId: req.body.productVariantId });
                }
                await checkCart.save();
                return res.send({ message: "Product add to cart", data: checkCart });

            }

        } else {
            return res.status(204).send({ message: "Please add this product to your wishlist fist." })
        }
    } else {
        return res.status(204).send({ message: 'No product in your wishlist' });
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

    // this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}
