let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let orderItemsSchema = new mongoose.Schema({

    orderId: { type: ObjectId, ref: "orders" },
    productVariantId: { type: ObjectId, ref: "productVariants" },
    productVariantImages: { type: Array, default: [] },
    productVariantDetails: { type: Array, default: [] },
    sellerId: { type: ObjectId, ref: "sellers" },
    retailPrice: { type: Number, default: 0 },

    offerPrice: { type: Number, default: 0 },
    offerDiscount: { type: Number, default: 0 },
    offerPricingItemId: { type: ObjectId, ref: "offerpricingitems", default: null },

    couponItemId: { type: ObjectId, ref: "couponitems", default: null },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },
    couponPrice: { type: Number, default: 0 },

    totalDiscount: { type: Number, default: 0 },
    // totalDiscount: { type: Number, default: null },
    quantity: { type: Number, required: true },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalUnitPrice: { type: Number, default: 0 },

    shipment: { type: Object, required: true },

    Cancelled: { type: Boolean, default: false },
    CancelledBy: { type: String, enum: ["Seller", "Admin", "Customer", ""], default: "" },
    CancelledComment: { type: String, default: "" },
    CancelledDateTime: { type: Date, default: null },

    Refunded: { type: Boolean, default: false },
    RefundedAmount: { type: String, default: "0" },
    RefundedBy: { type: String, enum: ["Seller", "Admin", ""], default: "" },
    RefundedTo: { type: String, enum: ["", "TAP", "WALLET"], default: "" },
    RefundChargesPaidBy: { type: String, enum: ["Admin", "Seller", "Customer", ""], default: "" },
    RefundedComment: { type: String, default: "" },
    RefundedDateTime: { type: Date, default: null },
    RefundedTransaction: { type: Object, default: null },

    Returned: { type: Boolean, default: false },
    ReturnedComment: { type: String, default: "" },
    ReturnedDateTime: { type: Date, default: null },
    commissionPercentage: { type: Number, default: 0 },
    // refundClosed: {
    //     type: Boolean,
    //     default: false
    // },

    createdDate: Number,
    updatedDate: Number
},
    { timestamps: true }
)


orderItemsSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
orderItemsSchema.plugin(autoIncrement.plugin, {
    model: "orderitems", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let orderItemsModel = mongoose.model("orderitems", orderItemsSchema)
module.exports = orderItemsModel