let allModels = require("../../../../utilities/allModels")
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

exports.sellerMessageCustomerList = async (req, res) => {

    const validationError = validationResult(req);
    //console.log(req.userId)
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    //console.log(req.userId)

    let customerIds = [];
    let customerIdsTo = await allModels.customerSellerMessaging.distinct(
        "to", { "from": req.query.sellerId }
    )
    let customerIdsFrom = await allModels.customerSellerMessaging.distinct(
        "from", { "to": req.query.sellerId }
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
        let a = await allModels.customer.findOne({ _id: customerIds[i] }).select(["_id", "firstName", "lastName"])

            .lean();

        let lastMessage = await allModels.customerSellerMessaging.find({
            $or: [
                { 'to': req.query.sellerId, 'from': customerIds[i] },
                { 'to': customerIds[i], 'from': req.query.sellerId },
            ]
        }).select(["-__v", "-updatedAt"])
            .sort([["createdAt", "-1"]]).limit(1)

        if (a) {
            a['lastMessage'] = lastMessage;
            customer.push(a);
        }
    }

    let RESPONSE = customer.sort(function (a, b) { return b.lastMessage[0].createdAt - a.lastMessage[0].createdAt });
    //console.log(req.userId)
    return res.send({ count: RESPONSE.length, customerIds: RESPONSE });

}

exports.adminGetMessages = async (req, res) => {
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

        const check = await allModels.customerSellerMessaging.find({})
            .sort([["createdAt", "-1"]])
            .limit(1)
        if (check.length == 0) {
            checkError = "You dont have any message";
            return ['', '', checkError];
        }
        const id = check[0]['_id'];

        if (lastId === null) {
            messages = await allModels.customerSellerMessaging.find({
                $or: [
                    { $and: [{ 'from': req.query.sellerId }, { 'to': req.query.toReceiverId }] },
                    { $and: [{ 'to': req.query.sellerId }, { 'from': req.query.toReceiverId }] },
                ],
            })
                .select(["-updatedAt", "-__v"])
                .sort({ "createdAt": "1" })
                .limit(page_size)
        }
        else {
            messages = await allModels.customerSellerMessaging.find({
                $or: [
                    { $and: [{ 'from':req.query.sellerId }, { 'to': req.query.toReceiverId }] },
                    { $and: [{ 'to': req.query.sellerId  }, { 'from': req.query.toReceiverId }] },
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
    return res.send({ messages: messages, lastId: new_last_id, receiver: a });

}

