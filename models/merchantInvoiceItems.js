let mongoose = require("mongoose");


let merchantInvoiceItemsSchema = new mongoose.Schema({

    merchantInvoiceId: {
        type: 'ObjectId',
        ref: "merchantinvoice",
        default: null
    },
    lineItem: { type: String },
    quantity: { type: Number },
    commission: { type: Number },
    preTaxAmount: { type: Number },
    taxAmount: { type: Number },
    postTaxAmount: { type: Number },
    createdDate: Number,
    updatedDate: Number

},
    { timestamps: true }
);
let merchantInvoiceItemsModel = mongoose.model("merchantinvoiceitems", merchantInvoiceItemsSchema);
module.exports = merchantInvoiceItemsModel;