let mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
let ngThis = this;
let couponSchema = new mongoose.Schema({

    couponName: { type: String },
    couponCode: { type: String },
    startDateTime: { type: Date },
    endDateTime: { type: Date },
    active:
    {
        type: Boolean,
        default: false
    },
    createdDate: Number,
    updatedDate: Number

},
    { timestamps: true }
)
couponSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }

    next()
});
autoIncrement.initialize(mongoose.connection);

couponSchema.plugin(autoIncrement.plugin, {
    model: "coupon", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let couponModel = mongoose.model('coupon', couponSchema)
module.exports = couponModel

//coupon view
// [{
//     $lookup: {
//         from: 'couponitems',
//         localField: '_id',
//         foreignField: 'couponId',
//         as: 'couponItem'
//     }
// }, {
//     $project: {
//         updatedAt: 0,
//         __v: 0,
//         'couponItem.__v': 0,
//         'couponItem.updatedAt': 0
//     }
// }]
//add,get

