let allModels = require("../../../utilities/allModels")
const { validationResult } = require('express-validator');
let mongoose = require("mongoose")
let upload = require("../../middlewares/AdminfileUpload");

let { sendNotification} = require("../../../website/v1/middlewares/sendNotification");



exports.getMessages = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const page_size = 15;
    const last_id = req.query.last_id;
    if (last_id) {
        let valid = mongoose.Types.ObjectId.isValid(last_id);
        if (!valid) {
            return res.status(402).send({ message: "Invalid lastId" });
        }
    }
    const getSpecificMessages = async (page_size = 1, lastId = null) => {
        let messages = '';
        let new_last_id = null;
        let checkError = '';

        const check = await allModels.customerSellerMessaging.find({
            $or: [
                { $and: [{ 'from': req.userId }, { 'to': req.query.toReceiverId }] },
                { $and: [{ 'to': req.userId }, { 'from': req.query.toReceiverId }] },
            ],
        }).sort([["createdAt", "-1"]])
            .limit(1)

        if (check.length == 0) {
            checkError = "You dont have any message";
            return ['', '', checkError];
        }
        const id = check[0]['_id'];

        if (lastId === null) {
            messages = await allModels.customerSellerMessaging.find({
                $or: [
                    { $and: [{ 'from': req.userId }, { 'to': req.query.toReceiverId }] },
                    { $and: [{ 'to': req.userId }, { 'from': req.query.toReceiverId }] },
                ],
            })
                .select(["-updatedAt", "-__v"])
                .sort({ "createdAt": "1" })
                .limit(page_size)
        }
        else {
            messages = await allModels.customerSellerMessaging.find({
                $or: [
                    { $and: [{ 'from': req.userId }, { 'to': req.query.toReceiverId }] },
                    { $and: [{ 'to': req.userId }, { 'from': req.query.toReceiverId }] },
                ],
                '_id': { '$lt': `${lastId}` }
            })
                .select(["-updatedAt", "-__v"])
                .sort({ "createdAt": "1" })
                .limit(page_size)
        }
        //messages.reverse();
        if (messages.length !== 0) {
            new_last_id = messages[0]['_id'];
        }
        if (lastId == id) {
            checkError = "You have the reached the end of the chat!";
        }

        return [messages, new_last_id, checkError];
    }

    const [messages, new_last_id, checkError] = await getSpecificMessages(page_size, last_id);
    if (checkError.length !== 0) {
        return res.status(403).send({ message: checkError });
    }
    if (messages.length === 0) {
        return res.status(403).send({ message: "You have no messages with them" });
    }

    let a = await allModels.seller.findOne({ _id: req.query.toReceiverId }).select(["_id", "nameOfBussinessEnglish"]);

    let update = { isSeen: true }
    await allModels.customerSellerMessaging.updateMany({
        $or: [
            // { $and: [{ 'from': req.userId }, { 'to': req.query.toReceiverId }] },
            { $and: [{ 'to': req.userId }, { 'from': req.query.toReceiverId }] },
        ],
    }, { $set: update })

    return res.send({ messages: messages, lastId: new_last_id, receiver: a });

}


exports.getInbox = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    // console.log("User: " + req.userId)
    try {
        const sellerIds = await allModels.customerSellerMessaging.distinct(
            "to", { "from": req.userId, "customerArchive": false }
        )
        //sellerIds.reverse();
        if (sellerIds.length == 0) {
            return res.status(403).send({ message: "You have no messages" });
        }

        let sellers = [];
        for (let i = 0; i < sellerIds.length; i++) {
            let a = await allModels.seller.findOne({ _id: sellerIds[i] }).select(["_id", "nameOfBussinessEnglish", "profileImage"]).lean();

            const message = await allModels.customerSellerMessaging.findOne({
                $or: [
                    { to: req.userId, from: sellerIds[i], customerArchive: false },
                    { to: sellerIds[i], from: req.userId, customerArchive: false }
                ]
            }).sort({ createdDate: -1 }).select(["message", "createdDate", "messageDateTime", "isSeen"])

            const unseenCount = await allModels.customerSellerMessaging.find({
                $or: [
                    { to: req.userId, from: sellerIds[i], customerArchive: false }
                ],
                isSeen: false
            }).select(["message", "messageDateTime", "isSeen"]).count()

            if (a) {
                a['lastMessage'] = message
                a['unseenCount'] = unseenCount
                sellers.push(a);
            }
        }

        sellers = sellers.sort((a, b) => {
            if (a.lastMessage.createdDate < b.lastMessage.createdDate) {
                return 1
            } else {
                return -1
            }
        });

        return res.send({ sellerIds: sellers });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.sendMessage = async (req, res, next) => {
    //console.log(req.body);
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const reqData = req.body;
    var currentdate = new Date();

    let newMessage = new allModels.customerSellerMessaging({
        to: reqData.toReceiverId,
        from: req.userId,
        message: reqData.message,
        reply: reqData.replyObjectId,
        messageDateTime: currentdate
    });


    let uploadLocation = `/${newMessage['from']}/` + newMessage['_id'];
    //console.log(uploadLocation);
    //console.log(newMessage);

    if (req.files) {
        try {
            await upload.fileUploadPath(req, next, 'media', uploadLocation);
            //   newMessage['media'] = req.filPath[0];
            newMessage['media'] = req.filPath
            // console.log(req.filpath)
        }
        catch (error) {
            next(error)
        }
    }

    let data = await newMessage.save();
    // console.log("userId", req.userId)
    // addNotification(req.userId, reqData.toReceiverId, "message", "New message", "website", req.userId)
    // addNotification(req.userId, reqData.toReceiverId, "message", "New message", "email", req.userId)

    //mark archive as false according to current user
    let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    let isSeller = await allModels.seller.findOne({ _id: req.userId });

    let update = {};
    if (isCustomer) {
        update = { customerArchive: false }
    } else if (isSeller) {
        update = { sellerArchive: false }
    } else if (isAdmin) {
        update = { adminArchive: false }
    }

    await allModels.customerSellerMessaging.updateMany({
        $or: [
            { $and: [{ 'from': req.userId }, { 'to': reqData.toReceiverId }] },
            { $and: [{ 'to': req.userId }, { 'from': reqData.toReceiverId }] },
        ],
    }, { $set: update })

    return res.send({ message: "Message sent!", d: data });
}


exports.archivemessage = async (req, res) => {
    let isCustomer = await allModels.customer.findOne({ _id: req.userId });
    let isAdmin = await allModels.admin.findOne({ _id: req.userId });
    let isSeller = await allModels.seller.findOne({ _id: req.userId });

    let update = {};
    if (isCustomer) {
        update = { customerArchive: true }
    } else if (isSeller) {
        update = { sellerArchive: true }
    } else if (isAdmin) {
        update = { adminArchive: true }
    }
    const reqData = req.body;
    let data = await allModels.customerSellerMessaging.updateMany({
        $or: [
            { $and: [{ 'from': req.userId }, { 'to': reqData.toReceiverId }] },
            { $and: [{ 'to': req.userId }, { 'from': reqData.toReceiverId }] },
        ],
    }, { $set: update })
    // console.log(data)
    return res.send({ message: "Your message has been archived successfully" });
}