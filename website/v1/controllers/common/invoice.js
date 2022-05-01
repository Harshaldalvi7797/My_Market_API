let allModels = require("../../../../utilities/allModels");

const convertDateTime = (createdAt) => {
    let date = createdAt;
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);

    // this.orderDate = `${year}-${mnth}-${day}T${hr}:${min}:${sec}`
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`);
};

const lastDateOfMonth = (y, m) => {
    return new Date(y, m + 1, 0).getDate();
}


exports.merchantInvoice = async (req, res) => {
    let { limit, page, month, year } = req.body;
    if (!limit) {
        limit = 10;
    }
    if (!page) {
        page = 1;
    }

    let perPage = parseInt(limit);
    let pageNo = Math.max(0, parseInt(page));

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    try {
        let currentDate = new Date();
        let endDate = new Date();
        let startDate = new Date();

        if (month != undefined) {
            endDate.setMonth(parseInt(month.toString()));
            startDate.setMonth(parseInt(month.toString()));
        }
        if (year != undefined) {
            endDate.setFullYear(year);
            startDate.setFullYear(year);
        }

        startDate.setDate(1);
        startDate.setHours(0);
        startDate.setMinutes(0);

        startDate.setMonth(2);
        endDate.setMonth(2);


        if (currentDate.getMonth() == endDate.getMonth()) {
            endDate.setHours(0);
            endDate.setMinutes(0);
        } else {
            let lastDate = lastDateOfMonth(endDate.getFullYear(), endDate.getMonth());
            endDate.setDate(lastDate);
            endDate.setHours(0);
            endDate.setMinutes(0);
        }
        let dateFilter = {
            $and: [
                { "order.createdDate": { $gte: convertDateTime(startDate) } },
                { "order.createdDate": { $lte: convertDateTime(endDate) } }
            ]
        }

        //console.log(startDate.getDate(), startDate.getMonth(), startDate.getFullYear());
        //console.log(endDate.getDate(), endDate.getMonth(), endDate.getFullYear());

        let merchantInvoice = await allModels.orderItems.aggregate([
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order",
                },
            },
            { $unwind: "$order" },
            { $match: dateFilter },
            {
                $lookup: {
                    from: "ordershippings",
                    let: { sellerId: "$sellerId", orderId: "$orderId" },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$$sellerId", "$sellerId"] },
                                    { $eq: ["$$orderId", "$orderId"] }
                                ]
                            }
                        }
                    }],
                    as: "ordershipping",
                },
            },
            { $unwind: "$ordershipping" },
            {
                $lookup: {
                    from: "orderstatusupdates",
                    localField: "ordershipping._id",
                    foreignField: "orderShippingId",
                    as: "orderstatusupdate",
                },
            },
            {
                $lookup: {
                    from: "offerpricingitems",
                    localField: "offerPricingItemId",
                    foreignField: "_id",
                    as: "offeritem"
                }
            },
            { $unwind: { path: "$offeritem", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "offerpricings",
                    localField: "offeritem.offerpricingId",
                    foreignField: "_id",
                    as: "offer"
                }
            },
            { $unwind: { path: "$offer", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "productvariants",
                    localField: "productVariantId",
                    foreignField: "_id",
                    as: "productvariants"
                }
            },
            { $unwind: "$productvariants" },
            {
                $lookup: {
                    from: "advertisementcampaigns",
                    localField: "productvariants.sellerId",
                    foreignField: "sellerId",
                    as: "advertisementcampaigns"
                }
            },
            {
                $lookup: {
                    from: "sellers",
                    localField: "productvariants.sellerId",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            { $unwind: "$seller" },
            {
                $addFields: {
                    commissionAmount: { $divide: ["$commissionPercentage", 100] }
                }
            },
            {
                $addFields: {
                    NetSales: {
                        $multiply: [{ $subtract: [{ $multiply: [{ $toDouble: "$retailPrice" }, "$quantity"] }, { $add: ["$totalDiscount", { $toDouble: "$RefundedAmount" }] }] }, "$commissionAmount"]
                    }
                }
            },
            {
                $addFields: {
                    VatAmount: {
                        $multiply: ["$NetSales", { $divide: [{ $toDouble: "$productvariants.productTaxPercentage" }, 100] }]
                    }
                }
            },
            {
                $project: {
                    createdDate: 1,
                    createdAt: 1,
                    orderDate: "$order.createdAt",
                    orderId: "$order._id",
                    orderIndexNo: "$order.indexNo",

                    productVariantName: "$productVariantDetails",
                    seller: "$seller.nameOfBussinessEnglish",
                    sellerId: "$seller._id",
                    sellerIndexNo: "$seller.indexNo",
                    sellerCommissionPercentage: "$commissionPercentage",
                    sellerCommissionAmount: "$commissionAmount",

                    //orderitems
                    grandTotal: 1,
                    totalTax: 1,

                    quantity: 1,
                    discounts: {
                        offerPrice: "$offerPrice",
                        offerName: "$offer.offerName",
                        // offerPercent: "$offer.offerName",
                        offerDiscount: "$offerDiscount",
                        couponCode: "$couponCode",
                        couponDiscount: "$couponDiscount",
                        totalDiscount: "$totalDiscount",
                    },
                    RefundedAmount: 1,
                    RefundedTaxAmount: 1,
                    advertisementcampaigns: 1,

                    productNetPrice: { $toDouble: "$retailPrice" },
                    grandTotal: { $toDouble: "$grandTotal" },
                    NetSales: 1,
                    VATPercentage: { $toDouble: "$productvariants.productTaxPercentage" },
                    VatAmount: 1,
                    GrossSale: { $subtract: ["$NetSales", "$VatAmount"] },
                    RefundedTaxAmount: {
                        $multiply: [
                            { $toDouble: "$RefundedAmount" },
                            { $divide: [{ $toDouble: "$productvariants.productTaxPercentage" }, 100] }
                        ]
                    },
                    totalAmount: { $add: ["$NetSales", "$VatAmount"] },
                    paymentType: "$order.paymentMethod",
                },

            },
            {
                $group: {
                    _id: "$sellerIndexNo",
                    seller: { $first: "$seller" },
                    sellerId: { $first: "$sellerId" },
                    taxAmount: { $sum: "$totalTax" },
                    quantity: { $sum: "$quantity" },
                    postTaxAmount: { $sum: "$grandTotal" },
                    sellerCommission: { $sum: "$sellerCommissionAmount" },
                    advertisements: { $first: "$advertisementcampaigns" }
                }
            },
            {
                $project: {
                    _id: 1,
                    seller: 1,
                    sellerId: 1,
                    quantity: 1,
                    taxAmount: 1,
                    postTaxAmount: 1,
                    sellerCommission: 1,
                    advertisementAmount: { $sum: "$advertisements.totalAmount" },
                    advertisementQty: { $size: "$advertisements" },
                    preTaxAmount: { $subtract: ["$postTaxAmount", "$taxAmount"] }
                }
            }
        ])

        for (let index = 0; index < merchantInvoice.length; index++) {
            const ele = merchantInvoice[index];

            let invCheck = await allModels.merchantinvoiceModel.find({
                sellerId: ele.sellerId,
                invoiceDate: endDate.getDate(),
                invoiceMonth: endDate.getMonth()+1,
                invoiceYear: endDate.getFullYear()
            })

            if (invCheck.length == 0) {
                let merchantInv = await allModels.merchantinvoiceModel.create({
                    sellerId: ele.sellerId,
                    invoiceDate: endDate.getDate(),
                    invoiceMonth: endDate.getMonth()+1,
                    invoiceYear: endDate.getFullYear(),
                })

                let lineItems = ["Sale", "Advertisement"]
                for (let j = 0; j < lineItems.length; j++) {
                    let merchantInvoiceItems = await allModels.merchantinvoiceItemsModel.create({
                        merchantInvoiceId: merchantInv._id,
                        lineItem: lineItems[j],
                        quantity: (j == 0) ? ele.quantity : ele.advertisementQty,
                        commission: (j == 0) ? ele.sellerCommission : 0,
                        preTaxAmount: (j == 0) ? ele.preTaxAmount : ele.advertisementAmount,
                        postTaxAmount: (j == 0) ? ele.postTaxAmount : ele.advertisementAmount,
                        taxAmount: (j == 0) ? ele.taxAmount : 0,
                    })
                }
            }
        }

        return res.send({ count: merchantInvoice.length, data: merchantInvoice })

    } catch (err) {
        return res.send({ message: err.message })
    }

}