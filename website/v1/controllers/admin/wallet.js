const allModels = require("../../../../utilities/allModels");
const mongoose = require("mongoose");
const { validationResult } = require('express-validator');

exports.adminwalletTransaction = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {

        let walletData = await allModels.walletModel.find({ customerId: req.body.customerId });
        let currentBalance = 0;
        if (walletData.length > 0) {
            let a = await allModels.walletModel.find({ customerId: req.body.customerId }).sort({ _id: -1 }).limit(1);
            currentBalance = parseFloat(a[0].currentBalance);
        }

        if (!req.body.amount || req.body.amount <= 0) {
            return res.send({ message: "Amount must be greater then 0" });
        }

        let wallet = null;
        if (req.body.transactionType === "credit" && walletData.length === 0) {
            //first transaction (credit)
            // let key = Object.keys(req.body.fundPayment);
            // if (key.indexOf("_id") != -1 && key.indexOf("customer") != -1 && key.indexOf("reciept") != -1 && key.indexOf("reference") != -1 && key.indexOf("transaction") != -1 && key.indexOf("source") != -1) {
            wallet = new allModels.walletModel({
                customerId: req.body.customerId,
                transactionType: "credit",
                creditAmount: parseFloat(req.body.amount),
                fundBy: { id: req.body.customerId, userType: "Admin" },
                fundReason: req.body.fundReason,
                fundRemarks: req.body.fundRemarks,
                fundPayment: req.body.fundPayment,
                currentBalance: parseFloat(req.body.amount)
            });
            // } else {
            //     return res.status(403).send({ message: "Unable to proceed transaction" });
            // }
        }

        else if (req.body.transactionType === "credit" && walletData.length > 0) {
            // console.log("hi")
            // let key = Object.keys(req.body.fundPayment);
            // if (key.length > 0) {
            //credit transaction
            // if (key.indexOf("_id") != -1 && key.indexOf("customer") != -1 && key.indexOf("reciept") != -1 && key.indexOf("reference") != -1 && key.indexOf("transaction") != -1 && key.indexOf("source") != -1) {
            wallet = new allModels.walletModel({
                customerId: req.body.customerId,
                transactionType: 'credit',
                creditAmount: parseFloat(req.body.amount),
                fundBy: { id: req.body.customerId, userType: "Admin" },
                fundReason: req.body.fundReason,
                fundRemarks: req.body.fundRemarks,
                fundPayment: req.body.fundPayment,
                currentBalance: parseFloat(currentBalance + parseFloat(req.body.amount)).toFixed(3)
            });
            // } 
            // else {
            //     return res.status(403).send({ message: "Unable to proceed transaction" });
            // }
            // } else {
            //     return res.status(403).send({ message: "Unable to proceed transaction" });
            // }
        }

        else if (req.body.amount && req.body.transactionType === "debit") {
            //Debit transaction
            if ((currentBalance - req.body.amount) < 0) {
                return res.status(403).send({ message: "Unable to proceed transaction. Insufficient balance" });
            }
            wallet = new allModels.walletModel({
                customerId: req.body.customerId,
                transactionType: 'debit',
                debitAmount: parseFloat(req.body.amount),
                fundBy: { id: req.body.customerId, userType: "Admin" },
                fundReason: req.body.fundReason,
                fundRemarks: req.body.fundRemarks,
                // orderId: req.body.orderId,
                currentBalance: parseFloat(currentBalance - parseFloat(req.body.amount)).toFixed(3)
            });
        } else {
            return res.status(403).send({ message: "Incorrect data entered" });
        }
        // console.log("wallet", wallet)
        await wallet.save()
        return res.send({ message: "Transaction successfull", data: wallet })
    }
    catch (error) {
        return res.status(403).send({ message: error.message })
    }


}

exports.allCustomerCurrentBalance = async (req, res) => {

    let { search } = req.body;
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
            { "fullName": regexp },
            { "emailAddress": regexp },
            { "mobilePhone": regexp }
        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "customerIndexNo": parseInt(search) }),
                filter["$or"].push({ "currentBalance": parseInt(search) })
        }
    }


    let customerBalance = await allModels.walletModel.aggregate([
        {
            $lookup: {
                from: 'customers',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customer'
            }
        },
        { $unwind: "$customer" },
        { $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
        {
            $group:
            {
                _id: "$customerId",
                walletIndexNo: { "$first": "$indexNo" },
                currentBalance: { "$last": { $toDouble: "$currentBalance" } },
                lastDate: { "$first": "$createdAt" },
                firstName: { "$first": "$customer.firstName" },
                emailAddress: { "$first": "$customer.emailAddress" },
                mobilePhone: { "$first": "$customer.mobilePhone" },

                lastName: { "$first": "$customer.lastName" },
                fullName: { "$first": "$customer.fullName" },
                customerIndexNo: { "$first": "$customer.indexNo" }
            }
        },
        { $unwind: "$firstName" },
        { $unwind: "$lastName" },
        { $unwind: "$customerIndexNo" },
        { $sort: { "walletIndexNo": -1 } },
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
    const customerBalanceList = customerBalance.length ? customerBalance[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = customerBalance[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: customerBalanceList.length, data: customerBalanceList });

}
exports.singleCustomerCurrentBalance = async (req, res) => {
    const customerId = mongoose.Types.ObjectId(req.body.id);

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
    let customerBalance = await allModels.walletModel.aggregate([
        { $match: { customerId: customerId } },
        {
            $lookup: {
                from: 'customers',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customer'
            }
        },
        { $unwind: "$customer" },
        { $addFields: { "customer.fullName": { $concat: ["$customer.firstName", " ", "$customer.lastName"] } } },
        {
            $group:
            {
                _id: "$customerId",
                walletIndexNo: { "$first": "$indexNo" },
                currentBalance: { "$last": { $toDouble: "$currentBalance" } },
                lastDate: { "$first": "$createdAt" },
                firstName: { "$first": "$customer.firstName" },
                emailAddress: { "$first": "$customer.emailAddress" },
                mobilePhone: { "$first": "$customer.mobilePhone" },

                lastName: { "$first": "$customer.lastName" },
                fullName: { "$first": "$customer.fullName" },
                customerIndexNo: { "$first": "$customer.indexNo" }
            }
        },
        { $unwind: "$firstName" },
        { $unwind: "$lastName" },
        { $unwind: "$customerIndexNo" },
        { $sort: { "walletIndexNo": -1 } },
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
    const customerBalanceList = customerBalance.length ? customerBalance[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = customerBalance[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: customerBalanceList.length, data: customerBalanceList });

    // return res.send({ count: customerBalance.length, data: customerBalance })
}


exports.customerTransactioins = async (req, res) => {
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
    const customerId = mongoose.Types.ObjectId(req.body.id);
    let customerTrans = await allModels.walletModel.aggregate([
        { $match: { customerId: customerId } },
        { $sort: { "indexNo": -1 } },

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
    const customerTransList = customerTrans.length ? customerTrans[0].paginatedResults : [];

    let totalCount = 0
    try {
        totalCount = customerTrans[0].totalCount[0].count
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: customerTransList.length, data: customerTransList });



}