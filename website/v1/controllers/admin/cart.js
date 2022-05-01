// core modules
const path = require("path");
const mongoose = require("mongoose");
var XLSX = require('xlsx');
const all_models = require("../../../../utilities/allModels");

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

exports.insert_cart = async (req, res, next) => {

    const { customerId, productVariantId, quantity = 0, status = 0, deviceIdentifier } = req.body;

    try {
        const productVariant = await all_models.productVariant.findById(productVariantId);

        if (!productVariant) {
            return res.status(422).json({ message: "Invalid product variant id selected" });
        }

        let cartData = null;
        if (deviceIdentifier) {
            cartData = await all_models.cartModel.findOne({ deviceIdentifier });
        } else {
            cartData = await all_models.cartModel.findOne({ customerId })
        }

        // If cart is not available then going to insert one.
        if (!cartData) {
            const cart = await new all_models.cartModel({
                customerId,
                productVariants: { productVariantId, quantity: quantity || 1 },
                status: status,
                deviceIdentifier: deviceIdentifier
            })
            const data = await cart.save()

            return res.status(201).json({ message: "Product added to cart!", data: data })
        }

        const filterVariantIndex = await cartData.productVariants.findIndex(
            variant => variant.productVariantId.toString() === productVariantId.toString()
        );


        if (filterVariantIndex !== -1) {
            const variantQuantity = cartData.productVariants[filterVariantIndex].quantity;
            cartData.productVariants[filterVariantIndex].quantity = (quantity ? +quantity : variantQuantity + 1);
            cartData.status = status;
        } else {
            cartData.productVariants.push({ productVariantId, quantity });
            cartData.status = status;
        }

        const updatedData = await cartData.save();
        return res.status(200).send({ message: "Product added to cart!", data: updatedData });

    } catch (error) { return res.status(403).send({ message: error.message }); }



};// End of insert_cart method

exports.cartWithSearch = async (req, res) => {
    let { search, country, startDate, endDate, products, seller } = req.body;
    let { limit, page } = req.body;

    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "customer.fullName": regexp },
            { "sellers.nameOfBussinessEnglish": regexp },
            { "deviceIdentifier": regexp },
            { "productVariant.productVariantDetails.productVariantName": regexp }
        ];
        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    if (country || startDate || endDate || products || seller) {
        filter["$and"] = [];
    }
    /* if (country) {
        filter["$and"].push({ "customer.customerCountry": { $in: country } });
    } */
    if (products) {
        filter["$and"].push({ "productVariant.productVariantDetails.productVariantName": { $in: products } });
    }
    if (seller) {
        filter["$and"].push({ "sellers.nameOfBussinessEnglish": { $in: seller } });
    }
    if (startDate) {
        startDate = new Date(startDate)
        startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
        startDate.setDate(startDate.getDate() - 1)
        let dt = convertDateTime(startDate);
        filter['$and'].push({ createdDate: { $gt: dt } })
    }

    if (endDate) {
        endDate = new Date(endDate)
        endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
        // end_date.setDate(end_date.getDate() + 1)
        let dt = convertDateTime(endDate);
        filter['$and'].push({ createdDate: { $lt: dt } })
    }

    let cart = await all_models.cartModel.aggregate([
        { $match: { "productVariants": { $ne: [] } } },
        { $unwind: "$productVariants" },
        {

            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customer"
            }
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariants.productVariantId",
                foreignField: "_id",
                as: "productVariant"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "productVariant.sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        {
            $unwind: {
                "path": "$customer",
                "preserveNullAndEmptyArrays": true
            }
        },
        { $unwind: "$productVariant" },
        { $unwind: "$sellers" },
        {
            $project: {
                _id: 1,
                indexNo: 1,
                status: 1,
                quantity: "$productVariants.quantity",
                "productVariant._id": 1,
                "productVariant.productVariantDetails": 1,
                deviceIdentifier: 1,
                createdDate: "$productVariants.createdDate",
                createdAt: "$productVariants.createdAt",
                // createdDate: 1,
                // updatedDate: 1,
                "customer._id": 1,
                "customer.firstName": 1,
                "customer.lastName": 1,
                "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
                "customer.customerCountry": 1,
                "sellers._id": 1,
                "sellers.nameOfBussinessEnglish": 1
            }
        },
        { $sort: { "indexNo": - 1 } },
        { $match: filter },
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

    const cartList = cart.length ? cart[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = cart[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: cartList.length, data: cartList });
}

exports.cartSellerAndProduct = async (req, res) => {

    let cart = await all_models.cartModel.aggregate([
        { $match: { "productVariants": { $ne: [] } } },
        { $unwind: "$productVariants" },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariants.productVariantId",
                foreignField: "_id",
                as: "productVariant"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "productVariant.sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        { $unwind: "$productVariant" },
        { $unwind: "$sellers" },
        {
            $project: {
                "productVariant.productVariantName": { $first: "$productVariant.productVariantDetails.productVariantName" },
                "sellers.nameOfBussinessEnglish": 1
            }
        },
        {
            $group: { _id: null, seller: { $addToSet: "$sellers.nameOfBussinessEnglish" }, product: { $addToSet: "$productVariant.productVariantName" } }
        },
        /* { $sort: { "seller": -1, "product": -1 } } */
    ]);
    return res.send({ data: cart });
}

exports.singleCart = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.send({ message: "There was no cart item found with given information!" })
        }
        let cart = await all_models.cartModel.findById(req.params.id)
            .populate(
                [
                    {
                        path: 'productVariants.productVariantId',
                        select: ["productVariantDetails", "_id", "sellerId"],
                        populate: [
                            {
                                path: 'sellerId',
                                select: ["_id", "sellerDetails"]
                            }
                        ]

                    },
                    {
                        path: 'customerId',
                        select: ["firstName", "lastName", "_id"]
                    }
                ]


            )
        return res.send({ cart });
    } catch (error) {
        return res.status(500).send({
            message: "Internal server error :(",
            systemErrorMessage: error.message,
        });
    }
}

exports.delete_cart = async (req, res, next) => {

    try {
        const { _id } = req.params;

        const { n: isDeleted } = await all_models.cartModel.deleteOne({ _id });

        return res.status(isDeleted ? 200 : 404).json({
            message: isDeleted ? "Cart has been removed successfully" : "Resource not found."
        });

    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

};// End of delete_cart method

exports.excelDownloadCart = async (req, res, next) => {
    let { search, country, startDate, endDate, products, seller } = req.body;
    
    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "customer.fullName": regexp },
            { "sellers.nameOfBussinessEnglish": regexp },
            { "deviceIdentifier": regexp },
            { "productVariant.productVariantDetails.productVariantName": regexp }
        ];
        if (!isNaN(parseInt(search))) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    if (country || startDate || endDate || products || seller) {
        filter["$and"] = [];
    }
    /* if (country) {
        filter["$and"].push({ "customer.customerCountry": { $in: country } });
    } */
    if (products) {
        filter["$and"].push({ "productVariant.productVariantDetails.productVariantName": { $in: products } });
    }
    if (seller) {
        filter["$and"].push({ "sellers.nameOfBussinessEnglish": { $in: seller } });
    }
    if (startDate) {
        startDate = new Date(startDate)
        startDate.setHours(23); startDate.setMinutes(59); startDate.setSeconds(59);
        startDate.setDate(startDate.getDate() - 1)
        let dt = convertDateTime(startDate);
        filter['$and'].push({ createdDate: { $gt: dt } })
    }

    if (endDate) {
        endDate = new Date(endDate)
        endDate.setHours(23); endDate.setMinutes(59); endDate.setSeconds(59);
        // end_date.setDate(end_date.getDate() + 1)
        let dt = convertDateTime(endDate);
        filter['$and'].push({ createdDate: { $lt: dt } })
    }

    let cart = await all_models.cartModel.aggregate([
        { $match: { "productVariants": { $ne: [] } } },
        { $unwind: "$productVariants" },
        {

            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customer"
            }
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "productVariants.productVariantId",
                foreignField: "_id",
                as: "productVariant"
            }
        },
        {
            $lookup: {
                from: "sellers",
                localField: "productVariant.sellerId",
                foreignField: "_id",
                as: "sellers"
            }
        },
        {
            $unwind: {
                "path": "$customer",
                "preserveNullAndEmptyArrays": true
            }
        },
        { $unwind: "$productVariant" },
        { $unwind: "$sellers" },
        {
            $project: {
                _id: 1,
                indexNo: 1,
                status: 1,
                quantity: "$productVariants.quantity",
                "productVariant._id": 1,
                "productVariant.productVariantDetails": 1,
                deviceIdentifier: 1,
                createdDate: "$productVariants.createdDate",
                createdAt: "$productVariants.createdAt",
                // createdDate: 1,
                // updatedDate: 1,
                "customer._id": 1,
                "customer.firstName": 1,
                "customer.lastName": 1,
                "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] },
                "customer.customerCountry": 1,
                "sellers._id": 1,
                "sellers.nameOfBussinessEnglish": 1
            }
        },
        { $sort: { "indexNo": - 1 } },
        { $match: filter },
    ])

    var wb = XLSX.utils.book_new(); //new workbook
    let excelExportData = []

    for (let index = 0; index < cart.length; index++) {
        const ele = cart[index];
       
        excelExportData.push({
            "Cart#": ele.indexNo,
            Name: ele.customer.fullName || null,
            DeviceIdentifier: ele.deviceIdentifier || null,
            Seller: ele.sellers.nameOfBussiness,
            ProductVariantId: ele.productVariant._id,
            EnglishProductVariantName: ele.productVariant.productVariantDetails[0].productVariantName,
            ArabicProductVariantName: ele.productVariant.productVariantDetails[1].productVariantName,
            Quantity: ele.quantity,
            CreatedAt: ele.createdAt
        });    
    }

    var temp = JSON.stringify(excelExportData);
    temp = JSON.parse(temp);
    var ws = XLSX.utils.json_to_sheet(temp);
    let today = new Date();

    var down = `uploads/reports/cartExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`

    //var down =  (   `/uploads/ReportcartExport_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`)
    XLSX.utils.book_append_sheet(wb, ws, "sheet1");

    XLSX.writeFile(wb, down); 


    let newReport = new all_models.reportModel({
        adminId: req.userId,
        ReportName: "cartExcel",
        ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
    })

    let data = await newReport.save()

    return res.send({ message: "Your download will begin now.", data: data })
}

exports.cartFilterProduct = async (req, res, next) => {

    let { limit, page, search } = req.body;

    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "productVariants.productVariantDetails.productVariantName": regexp },

        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }
    let cartProducts = await all_models.cartModel.aggregate([

        {
            $group: {
                _id: null, productVariants: { $addToSet: "$productVariants.productVariantId" }
            }
        },
        {
            $addFields: {
                unique: {
                    $reduce: {
                        input: "$productVariants",
                        initialValue: [],
                        in: { $setUnion: ["$$value", "$$this"] }
                    }
                },
            }
        },
        {
            $lookup: {
                from: 'productvariants',
                localField: 'unique',
                foreignField: '_id',
                as: 'productVariants'
            }
        },
        {
            $project: {
                "productVariants._id": 1,
                "productVariants.productVariantDetails.productVariantName": 1,
                "productVariants.productVariantDetails.pv_language": 1
            }
        },
        { $unwind: "$productVariants" },
        { $match: filter },
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
    const cartList = cartProducts.length ? cartProducts[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = cartProducts[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: cartList.length, data: cartList });


}


