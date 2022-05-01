let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
const { ObjectId } = mongoose.Schema;
let ngThis = this;

let merchantInvoiceSchema = new mongoose.Schema({

    sellerId: {
        type: 'ObjectId',
        ref: "sellers",
        default: null

    },
    invoiceDate: { type: Number },
    invoiceMonth: { type: Number },
    invoiceYear: { type: Number },
    // preTaxAmount: { type: Number },
    // taxAmount: { type: Number },
    // postTaxAmount: { type: Number },
    createdDate: Number,
    updatedDate: Number

},
    { timestamps: true }
);
merchantInvoiceSchema.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
autoIncrement.initialize(mongoose.connection);

merchantInvoiceSchema.plugin(autoIncrement.plugin, {
    model: "merchantinvoice", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});


let merchantInvoiceModal = mongoose.model("merchantinvoice", merchantInvoiceSchema);
module.exports = merchantInvoiceModal;