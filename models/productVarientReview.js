let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let productVarientReview = new mongoose.Schema({
    productVariantId: {
        type: 'ObjectId',
        ref: "productVariants"
    },
    customerId: {
        type: 'ObjectId',
        ref: "customers"
    },
    description: String,
    rating: Number,
    productImages: [],
    likedislike: [{
        customerId: { type: 'ObjectId', ref: "customers" },
        isLike: { type: Boolean, default: null }
    }],
    active: {
        type: Boolean,
        default: true
    },

    reportFlag: {
        type: Boolean,
        default: false
    },
    reportComment: { type: String },
    createdDate: Number,
    updatedDate: Number
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true
    },

)

productVarientReview.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }  
    
    next()
});

productVarientReview.virtual('likeCount').get(function () {
    let likeCount = this.likedislike.filter(a => {
        return a.isLike == true;
    })
    return likeCount.length;
});

productVarientReview.virtual('dislikeCount').get(function () {
    let dislikeCount = this.likedislike.filter(a => {
        return a.isLike == false;
    })
    return dislikeCount.length;
});


let productVarientReviewModel = mongoose.model('productVarientReview', productVarientReview);

module.exports = productVarientReviewModel;
