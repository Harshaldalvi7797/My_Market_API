let mongoose = require("mongoose");
let checkoutSchema = new mongoose.Schema({
    customerId: {
        type: 'ObjectId',
        ref: "customers"
    },
    order: {}
});

let checkoutModel = mongoose.model("checkout", checkoutSchema);
module.exports = checkoutModel;