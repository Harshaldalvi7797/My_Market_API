const { validationResult } = require('express-validator');
const ALL_MODELS = require('../../../utilities/allModels');

//Fetch customer 
exports.getCustomerWallet = async (req, res) => {
    let { limit, page } = req.query;

    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    let wallet = await ALL_MODELS.walletModel.find({ customerId: req.userId })
        .sort([["createdAt", "-1"]])
        .skip((perPage * pageNo))
        .limit(perPage);
    if (!wallet) {
        return res.status(403).send({ message: "Uh Oh! Invalid user." });
    }

    return res.send(wallet)

}

//create api for customer
exports.walletTransaction = async (req, res, next) => {

    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    try {

        let walletData = await ALL_MODELS.walletModel.find({ customerId: req.userId });
        let currentBalance = 0;
        if (walletData.length > 0) {
            let a = await ALL_MODELS.walletModel.find({ customerId: req.userId }).sort({ _id: -1 }).limit(1);
            currentBalance = parseFloat(a[0].currentBalance);
        }

        if (!req.body.amount || req.body.amount <= 0) {
            return res.send({ message: "Amount must be greater then 0" });
        }

        let wallet = null;
        if (walletData.length == 0 && checkJson(req.body.fundPayment)) {
            //first transaction (credit)
            let key = Object.keys(req.body.fundPayment);
            if (key.indexOf("_id") != -1 && key.indexOf("customer") != -1 && key.indexOf("receipt") != -1 && key.indexOf("reference") != -1 && key.indexOf("transaction") != -1 && key.indexOf("source") != -1) {
                wallet = new ALL_MODELS.walletModel({
                    customerId: req.userId,
                    transactionType: "credit",
                    creditAmount: parseFloat(req.body.amount),
                    fundBy: { id: req.userId, userType: "Customer" },
                    fundReason: req.body.fundReason,
                    fundRemarks: req.body.fundRemarks,
                    fundPayment: req.body.fundPayment,
                    currentBalance: parseFloat(req.body.amount)
                });
            } else {
                return res.status(403).send({ message: "Unable to proceed transaction" });
            }
        } else if (walletData.length > 0 && checkJson(req.body.fundPayment)) {
            let key = Object.keys(req.body.fundPayment);
            if (key.length > 0) {
                //credit transaction
                //console.log(key.indexOf("_id"), key.indexOf("customer"), key.indexOf("receipt"), key.indexOf("reference"), key.indexOf("transaction"), key.indexOf("source"));
                if (key.indexOf("_id") != -1 && key.indexOf("customer") != -1 && key.indexOf("receipt") != -1 && key.indexOf("reference") != -1 && key.indexOf("transaction") != -1 && key.indexOf("source") != -1) {
                    wallet = new ALL_MODELS.walletModel({
                        customerId: req.userId,
                        transactionType: 'credit',
                        creditAmount: req.body.amount,
                        fundBy: { id: req.userId, userType: "Customer" },
                        fundReason: req.body.fundReason,
                        fundRemarks: req.body.fundRemarks,
                        fundPayment: req.body.fundPayment,
                        currentBalance: parseFloat(currentBalance + parseFloat(req.body.amount)).toFixed(3)
                    });
                } else {
                    return res.status(403).send({ message: "Unable to proceed transaction" });
                }
            } else {
                return res.status(403).send({ message: "Unable to proceed transaction" });
            }
        } else if (req.body.orderId && req.body.amount && !req.body.fundPayment) {
            //Debit transaction
            if ((currentBalance - req.body.amount) < 0) {
                return res.status(403).send({ message: "Unable to proceed transaction. Insufficient balance" });
            }
            wallet = new ALL_MODELS.walletModel({
                customerId: req.userId,
                transactionType: 'debit',
                debitAmount: req.body.amount,
                fundBy: { id: req.userId, userType: "Customer" },
                fundReason: req.body.fundReason,
                fundRemarks: req.body.fundRemarks,
                orderId: req.body.orderId,
                currentBalance: parseFloat(currentBalance - parseFloat(req.body.amount)).toFixed(3)
            });
        } else {
            return res.status(403).send({ message: "Incorrect data entered" });
        }

        let walletSave = await wallet.save()
        return res.send({ message: "Transaction successfull", data: walletSave })
    } catch (error) {
        return res.status(403).send({ message: error.message })
    }

}

exports.getBalance = async (req, res, next) => {
    try {

        let wallet = await ALL_MODELS.walletModel.find({ customerId: req.userId }).select(["currentBalance", "createdAt"]).sort({ _id: -1 }).limit(1);
        if (!wallet) {
            return res.status(403).send({ message: "Uh Oh! Invalid user." });
        }
        if (wallet.length <= 0) {
            return res.send({ currentBalance: 0 });
        }
        return res.send(wallet[0])

    }
    catch (error) {
        return res.status(403).send({ message: error.message });

    }


}

//Fetch api for admin


//create api for admin



checkJson = (data) => {
    let item = null;
    try {
        item = JSON.parse(data);
    } catch (e) {
        try {
            item = JSON.stringify(data);
            item = JSON.parse(item);
            item = true;
        } catch (error) {
            item = false;
        }
    }

    return item;
}
