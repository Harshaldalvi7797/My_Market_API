var allModels = require('../../../../utilities/allModels');
let mongoose = require("mongoose")
let { getRating } = require("../../../../common/productVariantReview")
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

        return res.send({ message: "Product added to wishlist", data: data })
    } else {
        let findData = await checkWishlist['productVariants'];
        let a = await findData.findIndex(x => x.productVariantId.toString() === productVariant._id.toString());

        if (a == -1) {
            checkWishlist['productVariants'].push({ productVariantId: productVariant._id });
            await checkWishlist.save();
        }
        return res.send({ message: "Product added to wishlist", data: checkWishlist })

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
        return res.send({ message: 'Your wishlist  is empty' });
    }

    let findData = await checkWishlist['productVariants'];
    //console.log(findData)
    let a = await findData.findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

    if (a != -1) {
        checkWishlist['productVariants'].splice(a, 1);
        await checkWishlist.save();
    }


    return res.send({ message: "Product removed from wishlist", itemcount: checkWishlist['productVariants'].length, data: checkWishlist })


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
                select: ["_id", "nameOfBussinessEnglish","nameOfBussinessArabic"]
            }
        ]
    }).select(["-__v", "-createdAt", "-updatedAt", "-status"]).lean()

    //console.log('-----', checkWishlist);
    try {
        if (!checkWishlist) {
            checkWishlist = {
                productVariants: []
            }
            return res.status(403).send({ count: 0, data: [] }); //message: "Your Wishlist is empty!",
        }

        let b = checkWishlist['productVariants'].filter(a => {
            //console.log(JSON.stringify(a['productVariantId']['sellerId']), '\n');
            return a['productVariantId']['sellerId'] != null;
        });

        //console.log('checkpoint 1', JSON.stringify(b), checkWishlist['productVariants'].length);
        let temp = [];
        if (b.length > 0) {
            await getRating(b, temp, true);
        }

        //console.log('checkpoint 2');
        checkWishlist['productVariants'] = temp

        for (let index = 0; index < checkWishlist.productVariants.length; index++) {
            const element = checkWishlist.productVariants[index].productVariantId._id;
            // console.log(element)
            let offer = await allModels.offerPricingItem.findOne({ "productVariantId": element })
                .select(["offerPrice", "discount", "discountType", "discountValue"])
                // console.log(offer)
            if (offer) {
                checkWishlist.productVariants[index].offerPrice = offer
            }
        }

        return res.send({ count: checkWishlist['productVariants'].length, d: checkWishlist })



        // else {
        //     return res.send({ message: "Data not found" })

        // }




    } catch (error) {
        return res.status(403).send({ message: error.message });
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
                    productVariants: { productVariantId: req.body.productVariantId }
                })
                let data = await cart.save()
                return res.send({ message: "Product add to cart", data: data });
            } else {
                let b = await checkCart['productVariants'].findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

                if (b == -1) {
                    await checkWishlist['productVariants'].push({ productVariantId: req.body.productVariantId });
                }
                await checkCart.save();
                return res.send({ message: "Product add to cart", data: checkCart });

            }

        } else {
            return res.send({ message: "Please add this product to your wishlist fist." })
        }
    } else {
        return res.send({ message: 'No product in your wishlist' });
    }
}