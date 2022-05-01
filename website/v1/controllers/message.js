let allModels = require("../../../utilities/allModels");
const { validationResult } = require('express-validator');
let mongoose = require("mongoose")
let upload = require("../middlewares/AdminfileUpload");

let { sendNotification } = require("../middlewares/sendNotification");

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
                .sort({ "createdAt": "-1" })
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
                .sort({ "createdAt": "-1" })
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
    //console.log(req.userId)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    //console.log(req.userId)
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

exports.getSellerInbox = async (req, res) => {
    const validationError = validationResult(req);
    //console.log(req.userId)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    //console.log(req.userId)

    let customerIds = [];
    let customerIdsTo = await allModels.customerSellerMessaging.distinct(
        "to", { "from": req.userId }
    )
    let customerIdsFrom = await allModels.customerSellerMessaging.distinct(
        "from", { "to": req.userId }
    )

    customerIds = customerIdsTo;
    for (let index = 0; index < customerIdsFrom.length; index++) {
        const element = customerIdsFrom[index];
        let f = customerIds.filter(f => {
            return f._id.toString() == element._id.toString();
        })
        if (f.length == 0) {
            customerIds.push(element)
        }
    }

    customerIds.reverse();
    if (customerIds.length == 0) {
        return res.status(403).send({ message: "You have no messages" });
    }
    //console.log(req.userId)
    let customer = [];
    for (let i = 0; i < customerIds.length; i++) {
        let a = await allModels.customer.findOne({ _id: customerIds[i] })
            .select(["_id", "firstName", "lastName"])
            .sort({ createdAt: -1 })
            .lean();

        let lastMessage = await allModels.customerSellerMessaging.findOne({
            $or: [
                { 'to': req.userId, 'from': customerIds[i] },
                { 'to': customerIds[i], 'from': req.userId },
            ]
        }).select(["-__v", "-updatedAt"]).sort([["createdAt", "-1"]])

        const unseenCount = await allModels.customerSellerMessaging.find({
            $or: [
                { to: req.userId, from: customerIds[i], customerArchive: false }
            ],
            isSeen: false
        }).select(["message", "messageDateTime", "isSeen"]).count()

        if (a) {
            a['lastMessage'] = lastMessage;
            a['unseenCount'] = unseenCount
            customer.push(a);
        }
    }

    customer = customer.sort((a, b) => {
        if (a.lastMessage.createdDate < b.lastMessage.createdDate) {
            return 1
        } else {
            return -1
        }
    });

    //let RESPONSE = customer.sort(function (a, b) { return b.lastMessage[0].createdAt - a.lastMessage[0].createdAt });
    //console.log(req.userId)
    return res.send({ customerIds: customer });
}


exports.sendMessage = async (req, res, next) => {
    /*  const validationError = validationResult(req);
     if (!validationError.isEmpty()) {
         return res.status(403).send({ message: validationError.array() });
     } */
    const reqData = req.body;

    try {
        if (!reqData.toReceiverId) {
            return res.status(403).send({ message: "Please enter valid toReceiverId" });
        }
        if (!req.files && !reqData.message) {
            return res.status(403).send({ message: "Please enter valid message" });
        }
        var currentdate = new Date();

        // console.log(reqData.toReceiverId)

        let newMessage = new allModels.customerSellerMessaging({
            to: reqData.toReceiverId,
            from: req.userId,
            message: reqData.message,
            reply: reqData.replyObjectId,
            messageDateTime: currentdate
        });
        // console.log(newMessage)

        if (req.files) {
            try {
                let uploadLocation = `/${newMessage['_id']}`;
                //console.log(uploadLocation);
                await upload.fileUpload(req, next, "media", uploadLocation);
                //console.log(req.filPath);
                newMessage['media'] = req.filPath;
                //console.log(newMessage);
            }
            catch (error) {
                return res.status(403).send({ message: error.message });
                // console.log(error)
            }
        }
        await newMessage.save();

        // addNotification(req.userId, reqData.toReceiverId, "message", "New message", "website", newMessage._id)
        // addNotification(req.userId, reqData.toReceiverId, "message", "New message", "email", newMessage._id)

        //sendNotification(req.userId, reqData.toReceiverId, "message", "email", newMessage._id, { seller: 3, customer: 27 }, newMessage)

        //Notification Work
        //checking receiver
        let rSeller = await allModels.seller.findOne({ _id: reqData.toReceiverId });
        let rCustomer = await allModels.customer.findOne({ _id: reqData.toReceiverId });
        let rAdmin = await allModels.admin.findOne({ _id: reqData.toReceiverId });
        let receiver = rSeller ? 'seller' : rCustomer ? 'customer' : rAdmin ? 'admin' : null

        //checking sender
        let sSeller = await allModels.seller.findOne({ _id: req.userId });
        let sCustomer = await allModels.customer.findOne({ _id: req.userId });
        let sAdmin = await allModels.admin.findOne({ _id: req.userId });
        let sender = sSeller ? 'seller' : sCustomer ? 'customer' : sAdmin ? 'admin' : null

        newMessage.customername = sCustomer ? sCustomer.firstName.toUpperCase() : rCustomer ? rCustomer.firstName.toUpperCase() : undefined
        newMessage.sellername = sSeller ? sSeller.nameOfBussinessEnglish : rSeller ? rSeller.nameOfBussinessEnglish : undefined

        var notificationId = null
        if (receiver == 'customer') {
            if (sender == 'seller') notificationId = '5'
            else if (sender == 'admin') notificationId = '6'
        }
        else if (receiver == 'seller') {
            if (sender == 'customer') notificationId = '22'
            else if (sender == 'admin') notificationId = '23'
        }
        else if (receiver == 'admin') {
            if (sender == 'customer') notificationId = '38'
            else if (sender == 'seller') notificationId = '39'
        }

        if (notificationId) sendNotification(req, req.userId, reqData.toReceiverId, notificationId, newMessage, "message", newMessage._id)

        return res.send({ message: "Message sent!" });
    } catch (error) {
        return res.status(403).send({ message: error.message });
    }

}

exports.messageIsSeen = async (req, res) => {
    let update = { isSeen: true }
    const reqData = req.body;
    let data = await allModels.customerSellerMessaging.updateMany({
        $or: [
            { $and: [{ 'from': req.userId }, { 'to': reqData.toReceiverId }] },
            { $and: [{ 'to': req.userId }, { 'from': reqData.toReceiverId }] },
        ],
    }, { $set: update })
    // console.log(data)
    return res.send({ message: "Your message has been seen successfully" });


}