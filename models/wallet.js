const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const walletSchema = new mongoose.Schema(
    {
        customerId:
        {
            type: ObjectId,
            ref: "customers",
        },
        transactionType: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        // transactionDateTime: { type: String },
        creditAmount: { type: String, default: null },
        debitAmount: { type: String, default: null },
        fundBy: {
            id: ObjectId,
            userType: { type: String, enum: ['Customer', 'Admin'] }
        },
        fundReason: { type: Object, default: null },
        fundRemarks: { type: String, default: null },
        fundPayment: { type: Object, default: null },
        orderId: { type: ObjectId, ref: "orders", default: null },
        orderIndexNo: { type: String, default: null },
        currentBalance: { type: String }
    },
    {
        timestamps: true,
    }
);
walletSchema.pre('save', function (next) {
    if (this.createdDate) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedDate) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
/* walletSchema.pre('save', function (next) {
    if (this.orderId || this.orderId != null || this.orderId != undefined) {
        this.orderIndexNo = '';
    }
    next()
}); */

autoIncrement.initialize(mongoose.connection);

walletSchema.plugin(autoIncrement.plugin, {
    model: "wallet", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
const walletModel = new mongoose.model("wallet", walletSchema);
module.exports = walletModel;