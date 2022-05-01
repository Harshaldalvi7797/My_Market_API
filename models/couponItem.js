let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
let ngThis = this;
let couponItemSchema = new mongoose.Schema({
    productVariantId: { type: 'ObjectId', ref: "productVariants" },
    couponId: { type: 'ObjectId', ref: "coupon" },
    discountType: {
        type: String,
        enum: ["flat", "percentage"],
        required: true,
    },
    //flat and percentage enum
    discountValue: { type: String, default: null },
    discountPrice: { type: String, default: null },
    discountAmount: { type: String, default: null },
    finalPrice: { type: String, default: null },
    createdDate: Number,
    updatedDate: Number
},
    { timestamps: true }
)
couponItemSchema.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
autoIncrement.initialize(mongoose.connection);

couponItemSchema.plugin(autoIncrement.plugin, {
    model: "couponitem", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let couponItemModel = mongoose.model('couponitem', couponItemSchema)
module.exports = couponItemModel

//api post,get 
/*
200
10% = 20
200-20=180
*/