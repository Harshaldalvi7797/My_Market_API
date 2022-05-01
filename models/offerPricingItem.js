let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
const { ObjectId } = mongoose.Schema;
let ngThis = this;

let offerPricingItemSchema = new mongoose.Schema({

    offerpricingId: { type: 'ObjectId', ref: "offerpricings" },
    productVariantId: { type: 'ObjectId', ref: "productVariants" },
    discountType: {
        type: String,
        enum: ["flat", "percentage"],
        required: true,
    },
    discountValue: { type: String },
    offerPrice: { type: String },
    offerPriceAmount: { type: String, default: null },
    FinalPrice: String,
    createdDate: Number,
    updatedDate: Number,
    active: {
        type: Boolean,
        default: true
    },

},

    { timestamps: true }
);
offerPricingItemSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});

autoIncrement.initialize(mongoose.connection);

offerPricingItemSchema.plugin(autoIncrement.plugin, {
    model: "offerpricingitems", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

let offerPricingItemModal = mongoose.model("offerpricingitems", offerPricingItemSchema);
module.exports = offerPricingItemModal;