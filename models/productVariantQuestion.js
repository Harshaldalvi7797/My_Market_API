let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");
let productVariantQuestionSchema = new mongoose.Schema({
    productVarientId:
    {
        type: 'ObjectId',
        ref: "productVariants"

    },
    customerId:
    {
        type: 'ObjectId',
        ref: "customers"

    },
    reportFlag: {
        type: Boolean,
        default: false
    },
    reportComment: { type: String, default: null },
    active: {
        type: Boolean,
        default: true
    },
    question: String,
    answer: String,
    likedislike: [{
        customerId: { type: ObjectId, ref: "customers" },
        isLike: { type: Boolean, default: null }
    }],
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }, timestamps: true
    })

productVariantQuestionSchema.virtual('likeCount').get(function () {
    let likeCount = this.likedislike.filter(a => {
        return a.isLike == true;
    })
    return likeCount.length;
});

productVariantQuestionSchema.virtual('dislikeCount').get(function () {
    let dislikeCount = this.likedislike.filter(a => {
        return a.isLike == false;
    })
    return dislikeCount.length;
});

autoIncrement.initialize(mongoose.connection);
productVariantQuestionSchema.plugin(autoIncrement.plugin, {
    model: "productvariantsquestions", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});


let productVariantQuestionModel = mongoose.model("productvariantsquestions", productVariantQuestionSchema)
module.exports = productVariantQuestionModel