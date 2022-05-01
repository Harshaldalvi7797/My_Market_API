let allModels = require("../../../utilities/allModels")
const { validationResult } = require('express-validator');

exports.saveForLetter = async (req, res) => {
    const validationError = validationResult(req)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let cart = await allModels.cartModel.findOne({ customerId: req.userId })
        .select(["productVariants.productVariantId"])

    if (cart) {

        let findData = await cart['productVariants'];
        let a = await findData.findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

        if (a != -1) {
            let checWishList = await allModels.wishlistModel.findOne({
                customerId: req.userId
            });

            cart['productVariants'].splice(a, 1);
            await cart.save();

            if (!checWishList) {
                let wishlist = new allModels.wishlistModel({
                    customerId: req.userId,
                    productVariants: { productVariantId: req.body.productVariantId }
                })
                let data = await wishlist.save()
                return res.send({ message: "Product saved for later", data: data });
            } else {
                let b = await checWishList['productVariants'].findIndex(x => x.productVariantId.toString() === req.body.productVariantId.toString());

                if (b == -1) {
                    await checWishList['productVariants'].push({ productVariantId: req.body.productVariantId });
                }
                await checWishList.save();
                return res.send({ message: "Product saved for later", data: checWishList });

            }

        } else {
            return res.send({ message: "Please add this product to your cart fist." })
        }
    } else {
        return res.status(402).send({ message: 'No product in your cart' });
    }

}