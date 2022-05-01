let allModels = require("../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose")

exports.seenSingleNotification = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let notificationCheck = await allModels.notification.find({ "_id": req.query.id })

    if (!notificationCheck) {
        return res.send({ message: "Please enter valid notification id" })
    }
    let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    let isSeller = await allModels.seller.findOne({ _id: req.userId });

    let customerId = isCustomer ? req.userId : null;
    let adminId = isAdmin ? req.userId : null;
    let sellerId = isSeller ? req.userId : null;
    // console.log(sellerId);

    let notification = await allModels.notification.aggregate([
        {
            $match: {
                $or: [
                    { customerId: mongoose.Types.ObjectId(customerId) },
                    { adminIds: mongoose.Types.ObjectId(adminId) },
                    { sellerId: mongoose.Types.ObjectId(sellerId) },
                ],
                notificationReceiveOn: "website",
                isNotificationSent: true,
                seenBy: null
            }
        },
        {
            $project: {
                sellerId: 1,
                notificationNameEnglish: 1,
                notificationNameArabic: 1,
                seenBy: 1,
                isNotificationSent: 1,
                notificationReceiveOn: 1,
                createdAt: 1
            }
        },
        { $sort: { 'createdAt': -1 } },
        // { $limit: 50 }
    ])
    // console.log(notification.length);

    let update = {
        seenBy: isCustomer ? isCustomer['firstName'] + ' (customer)' : (isSeller ? isSeller['nameOfBussiness'] + ' (seller)' : isAdmin ? isAdmin['firstName'] + ' (admin)' : null)
    }
    await allModels.notification.updateOne({

        _id: req.body.notificationId,
        $or: [
            { customerId: mongoose.Types.ObjectId(customerId) },
            { adminIds: mongoose.Types.ObjectId(adminId) },
            { sellerId: mongoose.Types.ObjectId(sellerId) },
        ],
        notificationReceiveOn: "website",
        isNotificationSent: true,
        seenBy: null
    }, { $set: update })

    return res.send({ message: "Notifications marked as read" });

}

exports.getTestnotifications = async (req, res) => {

    let notification = await allModels.notification.find().sort([['createdAt', -1]]);

    return res.send({ count: notification.length, data: notification })
}

exports.getNotification = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    let isSeller = await allModels.seller.findOne({ _id: req.userId });

    let customerId = isCustomer ? req.userId : null;
    let adminId = isAdmin ? req.userId : null;
    let sellerId = isSeller ? req.userId : null;

    let notification = await allModels.notification.aggregate([
        {
            $match: {
                $or: [
                    { customerId: mongoose.Types.ObjectId(customerId) },
                    { adminIds: mongoose.Types.ObjectId(adminId) },
                    { sellerId: mongoose.Types.ObjectId(sellerId) },
                ],
                notificationReceiveOn: "website",
                // seenBy: null
            }
        },
        {
            $project: {
                sellerId: 1,
                notificationNameEnglish: 1,
                notificationNameArabic: 1,
                seenBy: 1,
                isNotificationSent: 1,
                notificationReceiveOn: 1,
                notificationType: 1,
                notificationTypeId: 1,
                notificationFrom: 1,
                createdAt: 1,
            }
        },
        { $sort: { createdAt: -1, } },
        { $limit: 30 }
    ])

    let unseenCount = await allModels.notification.aggregate([
        {
            $match: {
                $or: [
                    { customerId: mongoose.Types.ObjectId(customerId) },
                    { adminIds: mongoose.Types.ObjectId(adminId) },
                    { sellerId: mongoose.Types.ObjectId(sellerId) },
                ],
                notificationReceiveOn: "website",
                seenBy: null
            }
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }
            }
        }
    ])

    await allModels.notification.updateMany({
        $or: [
            { customerId: mongoose.Types.ObjectId(customerId) },
            { adminIds: mongoose.Types.ObjectId(adminId) },
            { sellerId: mongoose.Types.ObjectId(sellerId) },
        ],
        notificationReceiveOn: "website",
        seenBy: null
    }, { $set: { isNotificationSent: true } })

    return res.send({ unseenCount: (unseenCount.length > 0) ? unseenCount[0].count : 0, data: notification });
    // const validationError = validationResult(req);
    // if (!validationError.isEmpty()) {
    //     return res.status(403).send({ message: validationError.array() });
    // }

    // let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    // let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    // let isSeller = await allModels.seller.findOne({ _id: req.userId });

    // let customerId = isCustomer ? req.userId : null;
    // let adminId = isAdmin ? req.userId : null;
    // let sellerId = isSeller ? req.userId : null;

    // let notification = await allModels.notification.find({
    //     customerId: customerId,
    //     adminIds: adminId,
    //     sellerId: sellerId,
    //     notificationReceiveOn: "website",
    //     seenBy: null
    // })
    // .select(["-__v", "-deviceId", "-adminIds", "-customerId", "-sellerId", "-isNotificationSent"])
    // .sort([['createdAt', '-1']])
    // .lean()

    // if (notification.length > 0) {
    //     for (let index = 0; index < notification.length; index++) {
    //         const element = notification[index];
    //         let a = await allModels.notification.findOne({ _id: element._id });
    //         a.isNotificationSent = true;
    //         await a.save();
    //     }
    // }

    // return res.send({ data: notification });
}

exports.markAsReadNotification = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    let isSeller = await allModels.seller.findOne({ _id: req.userId });

    let customerId = isCustomer ? req.userId : null;
    let adminId = isAdmin ? req.userId : null;
    let sellerId = isSeller ? req.userId : null;
    // console.log(sellerId);

    let notification = await allModels.notification.aggregate([
        {
            $match: {
                $or: [
                    { customerId: mongoose.Types.ObjectId(customerId) },
                    { adminIds: mongoose.Types.ObjectId(adminId) },
                    { sellerId: mongoose.Types.ObjectId(sellerId) },
                ],
                notificationReceiveOn: "website",
                isNotificationSent: true,
                seenBy: null
            }
        },
        {
            $project: {
                sellerId: 1,
                notificationNameEnglish: 1,
                notificationNameArabic: 1,
                seenBy: 1,
                isNotificationSent: 1,
                notificationReceiveOn: 1,
                createdAt: 1
            }
        },
        { $sort: { 'createdAt': -1 } },
        // { $limit: 50 }
    ])
    // console.log(notification.length);

    let update = {
        seenBy: isCustomer ? isCustomer['firstName'] + ' (customer)' : (isSeller ? isSeller['nameOfBussiness'] + ' (seller)' : isAdmin ? isAdmin['firstName'] + ' (admin)' : null)
    }
    await allModels.notification.updateMany({
        $or: [
            { customerId: mongoose.Types.ObjectId(customerId) },
            { adminIds: mongoose.Types.ObjectId(adminId) },
            { sellerId: mongoose.Types.ObjectId(sellerId) },
        ],
        notificationReceiveOn: "website",
        isNotificationSent: true,
        seenBy: null
    }, { $set: update })

    return res.send({ message: "Notifications marked as read" });


    // const validationError = validationResult(req);
    // if (!validationError.isEmpty()) {
    //     return res.status(403).send({ message: validationError.array() });
    // }

    // let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    // let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    // let isSeller = await allModels.seller.findOne({ _id: req.userId });

    // let customerId = isCustomer ? req.userId : null;
    // let adminId = isAdmin ? req.userId : null;
    // let sellerId = isSeller ? req.userId : null;

    // let notification = await allModels.notification.find({
    //     customerId: customerId,
    //     adminIds: adminId,
    //     sellerId: sellerId,
    //     notificationReceiveOn: "website",
    //     isNotificationSent: true,
    //     seenBy: null
    // }).select(["-__v", "-deviceId", "-adminIds", "-customerId", "-sellerId", "-isNotificationSent"]).lean();

    // if (notification.length > 0) {
    //     for (let index = 0; index < notification.length; index++) {
    //         const element = notification[index];
    //         let a = await allModels.notification.findOne({ _id: element._id });
    //         a.seenBy = isCustomer ? isCustomer['firstName'] + ' (customer)' : (isSeller ? isSeller['nameOfBussiness'] + ' (seller)' : isAdmin ? isAdmin['firstName'] + ' (admin)' : null);
    //         //console.log(a.seenBy);
    //         await a.save();
    //     }
    // }
    // return res.send({ message: "Notifications marked as read" });
}