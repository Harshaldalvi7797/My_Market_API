const { validationResult } = require("express-validator");
let upload = require("./../../middlewares/AdminfileUpload");
const allModels = require("../../../../utilities/allModels");
const { createDirectories } = require('./../../middlewares/checkCreateFolder');
let mongoose = require("mongoose");
var XLSX = require('xlsx');


exports.couponStatusUpdate = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "There was no coupon found with given information!" })
        }
        let coupon = await allModels.couponModel.findOne({ "_id": req.body.id })
        if (!coupon)
            return res.status(404).send({
                message: "There was no Add charges found with given information!",
            });
        coupon.active = req.body.active
        coupon.save()
        return res.send({ message: "Coupon status has been updated." });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}



exports.addCoupon = async (req, res, next) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let newCoupon = new allModels.couponModel({
            couponName: req.body.couponName,
            couponCode: req.body.couponCode,
            status: req.body.status,
            startDateTime: new Date(req.body.startDateTime),
            endDateTime: new Date(req.body.endDateTime)
        })
        let data = await newCoupon.save()
        return res.send({ message: "New coupon has been added.", d: data })
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.editCoupon = async (req, res) => {
    try {
        const couponId = req.body.id;
        let coupon = await allModels.couponModel.findOne({ _id: couponId });
        if (!coupon) {
            return res.status(404).send({
                message: "There was no coupon  found with given information!",
            });
        }
        let bodyData = req.body;

        if (bodyData.startDateTime) {
            bodyData.startDateTime = new Date(bodyData.startDateTime)
        }
        if (bodyData.endDateTime) {
            bodyData.endDateTime = new Date(bodyData.endDateTime)
        }

        const updateKeys = Object.keys(bodyData);
        updateKeys.forEach((update) => (coupon[update] = bodyData[update]));
        await coupon.save();
        return res.send({ message: "Coupon has been updated.", coupon });


    }
    catch (error) {
        return res.status(500).send(error.message)
    }

}

exports.couponWithSearch = async (req, res) => {
    const { search } = req.body;
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

            { "couponName": regexp },
            { "couponCode": regexp }
        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }


    let coupons = await allModels.couponModel.aggregate([
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
    const couponList = coupons.length ? coupons[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = coupons[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: couponList.length, data: couponList });


}

exports.getCoupon = async (req, res) => {

    try {
        let coupon = await allModels.couponModel.find()

        return res.send(coupon)

    }
    catch (error) {
        return res.status(403).send({ message: error.message });

    }

}

exports.singleCouponView = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {
        let coupons = await allModels.couponModel.aggregate([
            { $match: {} },

            {
                $lookup: {
                    from: 'couponitems', localField: '_id',
                    foreignField: 'couponId', as: 'coupons'
                }
            },
            { $match: { "_id": mongoose.Types.ObjectId(req.query.couponId) } },
        ])
        return res.send({ data: coupons })
    } catch (error) {
        return res.status(500).send(error.message)
    }
}

exports.couponExcel = async (req, res) => {

    const { search } = req.body;
    
    const filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [

            { "couponName": regexp },
            { "couponCode": regexp }
        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) })
        }
    }

    let coupons = await allModels.couponModel.aggregate([
        { $sort: { "indexNo": - 1 } },
        { $match: filter },
    ])

    var wb = XLSX.utils.book_new(); //new workbook

    // let coupons = await allModels.couponModel.find()
    let excelExportData = []

    for (let index = 0; index < coupons.length; index++) {
        const element = coupons[index];

        excelExportData.push({
     
        })
    }
    var temp = JSON.stringify(excelExportData);
    temp = JSON.parse(temp);
    var ws = XLSX.utils.json_to_sheet(temp);
    let today = new Date();
    let folder = `uploads/reports/admin-coupon/${req.userId}/`;
    //check if folder exist or not if not then create folder user createdirectory middleware
    await createDirectories(folder);
    var down = `${folder}admin-coupon_${today.toDateString()}_${today.getHours()}${today.getMinutes()}${today.getSeconds()}.xlsx`
    XLSX.utils.book_append_sheet(wb, ws, "sheet1");
    XLSX.writeFile(wb, down);
    let newReport = new allModels.reportModel({
        adminId: req.userId,
        ReportName: "couponExcel",
        ReportLink: (req.headers.host + down).replace(/uploads\//g, "/")
    })

    let data = await newReport.save()
    return res.send({ message: "Your download will begin now.", data: data })
    //return res.send({count:coupons.length,data:coupons})


}

exports.couponProducts = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
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
    let couponProducts = await allModels.couponItemModel.aggregate([
        { $match: { "couponId": mongoose.Types.ObjectId(req.body.couponId) } },
        {
            $lookup: {
                from: 'productvariants', localField: 'productVariantId',
                foreignField: '_id', as: 'products'
            }
        },
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
    return res.send({ count: couponProducts.length, data: couponProducts })
}

