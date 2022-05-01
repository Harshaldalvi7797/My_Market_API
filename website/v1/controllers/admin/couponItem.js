const { validationResult } = require("express-validator");
const allModels = require("../../../../utilities/allModels");
let mongoose = require("mongoose");

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

exports.addCouponItem = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let data = req.body;
        let RESPONSE = [];
        if (data.length) {
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                // console.log(data)
                try {
                    const today = new Date();
                    let coupon = await allModels.couponModel.findOne({
                        _id: element.couponId,
                        endDateTime: { $gt: today }
                    }).select(['-__v', '-createdAt', '-updatedAt']);
                    // console.log(coupon)
                    if (!coupon) {
                        return res.status(403).send({ message: "Invalid/Expired coupon selected" });
                    }

                    let { productVariantId, discountValue, discountType, couponId } = req.body;
                    let productvariant = await allModels.productVariant.findOne({ "_id": element.productVariantId })
                        .select(["productNetPrice"]);
                    if (!productvariant) {
                        RESPONSE.push({ error: "There was no product found with given information!", productVariantId: productVariantId });
                    } else {


                        let discountPrice
                        let discountAmount

                        if (element.discountType == "flat") {
                            discountPrice = productvariant.productNetPrice - (element.discountValue)
                            discountAmount = productvariant.productNetPrice - discountPrice
                            //console.log(discountAmount)
                        }

                        if (element.discountType == "percentage") {
                            let discountPricea = (element.discountValue / 100) * productvariant.productNetPrice;
                            discountPrice = productvariant.productNetPrice - discountPricea

                            discountAmount = productvariant.productNetPrice - discountPrice
                            discountPrice = productvariant.productNetPrice - element.discountValue
                        }

                        let newCouponitem = new allModels.couponItemModel({
                            productVariantId: element.productVariantId,
                            couponId: element.couponId,
                            discountType: element.discountType,
                            discountValue: element.discountValue,
                            discountPrice: discountPrice,
                            discountAmount: discountAmount
                        })
                        // console.log("newCouponitem", newCouponitem)
                        let data = await newCouponitem.save()
                        RESPONSE.push(data);
                    }
                }
                catch (error) {
                    RESPONSE.push({ error: error.message, productVariantId: element.productVariantId });
                }
            }
            return res.send({ message: "Item has been added to Coupon.", d: RESPONSE });
        }
        else {
            return res.status(403).send({ message: "Invalid data provided" })
        }

    }
    catch (error) {
        return res.status(403).send({ message: error.message })
    }

    // let { productVariantId, discountValue, discountType, couponId } = req.body;

    // console.log(req.body.discountValue)

    // let couponItemProduct = await allModels.couponItemModel.findOne({"productVariantId":req.body.productVariantId})

    // if(couponItemProduct)
    // {
    //     return res.send({message:"Alredy product has coupon"})
    // }

    // let productvariant = await allModels.productVariant.findOne({ "_id": productVariantId })
    //     .select(["productNetPrice"]);

    // if (!productvariant) {
    //     return res.send({ message: "Invalid productvariant" })
    // }


    // let discountPrice

    // if (discountType == "flat") {
    //     discountPrice = productvariant.productNetPrice - discountValue
    //     discountAmount = productvariant.productNetPrice - discountPrice
    // }

    // if (discountType == "percentage") {
    //     let discountPricea = (discountValue / 100) * productvariant.productNetPrice;
    //     discountPrice = productvariant.productNetPrice - discountPricea

    //     discountAmount = productvariant.productNetPrice - discountPrice
    //     discountPrice = productvariant.productNetPrice - discountValue
    // }

    // if (discountType == "percentage") {
    //     let discountPricea = (dicountvalue / 100) * productvariant.productNetPrice;
    //     discountPrice = productvariant.productNetPrice - discountPricea
    // }


    // try {
    //     let newCouponitem = new allModels.couponItemModel({
    //         productVariantId: productVariantId,
    //         couponId: couponId,
    //         discountType: discountType,
    //         discountValue: discountValue,
    //         discountPrice: discountPrice,
    //         discountAmount: discountAmount
    //     })
    //     // console.log(newCouponitem)
    //     let data = await newCouponitem.save()
    //     return res.send({ message: "New newCouponitem created Successfully", d: data })
    // }
    // catch (error) {
    //     return res.status(403).send({ message: error.message });
    // }
}

exports.getCouponItems = async (req, res, next) => {
    try {
        let coupon = await allModels.couponItemModel.find();
        return res.send(coupon)
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.couponItemProduct = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const today = new Date();

    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);

    //console.log(req.userId);

    if (endDate < today) {
        return res.status(403).send({ message: 'end date must be greater/equal to today date', data: [], count: 0 });
    }

    const producutVariant = await allModels.productVariant.aggregate([
        {
            $lookup: {
                from: "couponitems",
                localField: "_id",
                foreignField: "productVariantId",
                as: "couponItems"
            }
        },
        {
            $lookup: {
                from: "coupons",
                localField: "couponItems.couponId",
                foreignField: "_id",
                as: "coupons"
            }
        },
        { $match: { $or: [{ coupons: [] }, { coupons: null }, { 'coupons.active': { $ne: false } }] } },
        {
            $match: {
                $and: [
                    // { "sellerId": mongoose.Types.ObjectId(req.userId) },
                    {
                        $or: [
                            {
                                $and: [
                                    { 'coupons.endDateTime': { $ne: { $eq: endDate } } },
                                ],
                            },

                        ]
                    }
                ]
            }
        },
        {
            $project: {
                coupons: 1,
                couponItems: 1,
                productNetPrice: 1,
                offerPrice: 1,
                productVariantNames: {
                    $map: {
                        input: "$productVariantDetails",
                        as: "productVariantDetail",
                        in: "$$productVariantDetail.productVariantName"
                    }
                }
            }
        }
    ]);

    /* let pv = await allModels.productVariant.find()
        .select(["_id", "productVariantDetails"]) */

    return res.send({ count: producutVariant.length, data: producutVariant })

}

