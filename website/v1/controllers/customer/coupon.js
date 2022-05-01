let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
const mongoose = require('mongoose')

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

exports.couponCustomer = async (req, res) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    try {
        const today = new Date();
        // today.setHours(0);
        // today.setMinutes(0);
        today.setSeconds(0);
        today.setMilliseconds(0);
        let { productVariant } = req.body;
        if (typeof productVariant != 'object') {
            return res.status(403).send({ message: "Incorrect data provided for productVariant" });
        }

        let coupon = await allModels.couponModel.aggregate([
            {
                $match: {
                    "couponCode": req.body.couponCode,
                    startDateTime: { $lte: today },
                    endDateTime: { $gte: today },
                    active: true
                }
            },
            {
                $lookup: {
                    from: 'couponitems',
                    localField: '_id',
                    foreignField: 'couponId',
                    as: 'couponItem'
                }
            }, {
                $project: {
                    updatedAt: 0,
                    __v: 0,
                    'couponItem.__v': 0,
                    'couponItem.updatedAt': 0
                }
            }
        ]);

        if (coupon.length <= 0) {
            return res.send({ message: "Coupon code is invalid or expired. Try different coupon code." })
        }

        let RESPONSE = []
        for (let index = 0; index < productVariant.length; index++) {
            const element = productVariant[index];

            //"couponId": coupon._id,
            let couponItem = await allModels.couponItemModel.findOne({
                "couponId": coupon[0]._id,
                "productVariantId": element
            }).select(["discountType", "discountPrice", "discountValue", "discountAmount", "productVariantId"])
                .populate([{ path: "productVariantId", select: ["productNetPrice", "productGrossPrice", "productTaxPercentage", "productTaxPrice"] }])

            if (couponItem) {
                let datetime = convertDateTime(today);

                let checkoffer = await allModels.offerPricingItem
                    .findOne({ productVariantId: element, active: true });

                if (checkoffer) {
                    let offer = await allModels.offerPricing
                        .findOne({
                            _id: checkoffer.offerpricingId,
                            active: true,
                            startDate: { $lte: datetime },
                            endDate: { $gte: datetime },
                        });
                    //console.log(offer, datetime, checkoffer.offerpricingId)
                    if (!offer) {
                        checkoffer = null
                    }
                }

                let finalPvPrice = 0;
                if (checkoffer) {
                    if (couponItem.discountType.toLowerCase() == 'percentage') {
                        //console.log(checkoffer.offerPrice, couponItem.discountValue)
                        finalPvPrice = parseFloat(checkoffer.offerPrice.toString()) - (parseFloat(checkoffer.offerPrice.toString()) / 100) * parseFloat(couponItem.discountValue.toString());
                        couponItem.discountAmount = (parseFloat(checkoffer.offerPrice.toString()) / 100) * parseFloat(couponItem.discountValue.toString());
                        await couponItem.save();
                    } /* else if (couponItem.discountType.toLowerCase() == 'flat') {
                        finalPvPrice = (parseFloat(checkoffer.offerPrice) - parseFloat(couponItem.discountAmount))
                    } */
                } else {
                    finalPvPrice = parseFloat(couponItem.productVariantId.productNetPrice) - parseFloat(couponItem.discountAmount)
                }

                let appliedCoupon = {
                    id: element,
                    //offerpricingId: checkoffer.offerpricingId,
                    couponItemId: couponItem._id,
                    productVariantId: couponItem.productVariantId,
                    couponValue: couponItem.discountAmount,
                    couponType: couponItem.discountType,
                    offerPrice: (checkoffer) ? checkoffer.offerPrice : null,
                    productVariantPrice: finalPvPrice
                };
                // console.log("appliedCoupon", appliedCoupon)

                RESPONSE.push(appliedCoupon);
            }
        }
        if (RESPONSE.length <= 0) {
            return res.status(403).send({ message: "Coupon code not applicable for this products" });
        }
        //console.log(RESPONSE.length);
        // return res.send(RESPONSE);
        return res.send({ data: RESPONSE });
    }
    catch (error) {
        return error
    }

}

