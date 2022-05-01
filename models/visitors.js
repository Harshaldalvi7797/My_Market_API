const mongoose = require('mongoose');
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");
const visitorsSchema = new mongoose.Schema({
    customerId:
    {
        type: 'ObjectId',
        ref: "customers"
    },
    deviceIdentifier: String,
    sellerId:
    {
        type: 'ObjectId',
        ref: "sellers"

    },
    productVariantId: { type: 'ObjectId', ref: "productVariants" },
    clickCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    createdDate: Number,
    updatedDate: Number

}, { timestamps: true })

visitorsSchema.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
autoIncrement.initialize(mongoose.connection);

visitorsSchema.plugin(autoIncrement.plugin, {
    model: "visitors", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

module.exports = mongoose.model('visitors', visitorsSchema);

/*
seller => 1:[p1,p2,p3]
{
    cid:23423,
    sellerid:123,
    pvID:p1,
    count:2
    deviceidentifier:43124
},
{
    cid:23423,
    sellerid:123,
    pvID:p2,
    count:3
    deviceidentifier:43124
},
{
    cid:23423,
    sellerid:123,
    pvID:p3,
    count:4
    deviceidentifier:43124
},
{
    cid:1213,
    sellerid:123,
    pvID:p1,
    count:2
    deviceidentifier:43124
},
{
    cid:1213,
    sellerid:123,
    pvID:p2,
    count:3
    deviceidentifier:43124
},
{
    cid:1213,
    sellerid:123,
    pvID:p3,
    count:4
    deviceidentifier:43124
}

*/