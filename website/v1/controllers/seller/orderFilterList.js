let allModels = require("../../../../utilities/allModels")
const mongoose = require("mongoose");

exports.SellerOrderStatus = async (req, res) => {

    let status = ["Processing", "Shipped", "Delivered", "On_Hold", "New", "Cancelled", "Ready_To_Pickup"];
    return res.send({ count: status.length, d: status })
}

exports.SellerOrderpaymentMethod = async (req, res) => {
    let paymentMethod = ["ONLINE", "CASH", "MY_MARKET_WALLET"];
    return res.send({ count: paymentMethod.length, d: paymentMethod })
}

exports.SellerOrderCountry = async (req, res) => {

    let clist = ["Bahrain", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates"];
    let countries = [];
    for (let index = 0; index < clist.length; index++) {
        const element = clist[index];
        let a = { customerDelhiveryDetails: { shippingDetails: { country: element } } }
        countries.push(a)

    }

    return res.send({ count: countries.length, d: countries })
}

