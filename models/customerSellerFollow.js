let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let customerSellerFollowings = new mongoose.Schema({
    customerId:
    {
        type: 'ObjectId',
        ref: "customers"

    },
    sellerId:
    {
        type: 'ObjectId',
        ref: "sellers"
    },
    createdDate: Number,
    updatedDate: Number
},
    { timestamps: true })

customerSellerFollowings.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});

let customerSellerFollowingModel = mongoose.model("customersellerfollowing", customerSellerFollowings)
module.exports = customerSellerFollowingModel