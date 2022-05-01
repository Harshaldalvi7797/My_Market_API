let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
const autoIncrement = require("mongoose-auto-increment");
let ngThis = this;
let productVariantSchema = new mongoose.Schema({

    productSKU: String,
    productVariantImages: [Object],
    promotionVideo: { type: String, default: null },
    productId:
    {
        type: 'ObjectId',
        ref: "products"
    },
    brandId:
    {
        type: 'ObjectId',
        ref: "brands"
    },
    sellerId:
    {
        type: 'ObjectId',
        ref: "sellers",
        default: null
    },
    adminId:
    {
        type: 'ObjectId',
        ref: "admins",
        default: null
    },
    trending: {
        serialNo: {
            type: Number, default: null, index: {
                unique: true,
                partialFilterExpression: {
                    trending: { type: String }
                }
            }
        },
        isTrending: { type: Boolean, default: null },
        date: { type: Date, default: null },
    },
    tags: [],
    search: { type: String, text: true },
    productVariantSpecifications: [],
    productVariantDetails: { type: Array, default: [] },

    productCurrency: { type: String },
    productGrossPrice: { type: String },
    productNetPrice: { type: String },
    productTaxPercentage: { type: String },
    productTaxPrice: { type: String },
    productTaxName: { type: String },

    orderQuantityMax: { type: String },
    orderQuantityMin: { type: String },

    inventoryQuantity: { type: String },
    inventoryReOrderLevel: { type: String },
    inventoryReOrderQuantity: { type: String },

    shipmentWidth: { type: String },
    shipmentLength: { type: String },
    shipmentHeight: { type: String },
    shipmentWeight: { type: String },

    /**New fields added */
    subscription: Boolean,
    subscriptionPrice: { type: String },
    subscriptionPriceWithoutTax: { type: String },
    subscriptionTaxAmount: { type: String },
    offerPrice: String,

    savingPercentage: { type: String, default: 0 },
    convenienceFee: { type: String }, //3
    codConveniencePrice: { type: String },
    internationalShippingPrice: { type: String, default: '0' }, //1
    domesticShippingPrice: { type: String, default: '0' }, //2
    additionalCod: { type: String, default: '0' },
    currency: String,

    active: {
        type: Boolean,
        default: false
    },
    adminApproval: {
        type: Boolean,
        default: false
    },
    createdDate: Number,
    updatedDate: Number

},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true
    }
)


/* productVariantSchema.virtual('averageRating').get(function () {
    let average = 0;
    return average;
}); */
/* productVariantSchema.virtual('products', {
    ref: 'products', // The model to use
    localField: 'productId', // Find people where `localField`
    foreignField: '_id', // is equal to `foreignField`
    count: true // And only get the number of docs
  }); */

productVariantSchema.pre('save', function (next) {
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }

    if (this.productVariantSpecifications) {
        for (let index = 0; index < this.productVariantSpecifications.length; index++) {
            const ele = this.productVariantSpecifications[index];
            for (let i = 0; i < ele.length; i++) {
                if (!this.productVariantSpecifications[index][i]['_id']) {
                    this.productVariantSpecifications[index][i]['_id'] = mongoose.Types.ObjectId().toString()
                }
            }
        }
    }

    next()
});

autoIncrement.initialize(mongoose.connection);

productVariantSchema.plugin(autoIncrement.plugin, {
    model: "productVariants", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let productVariantModel = mongoose.model("productVariants", productVariantSchema)
module.exports = productVariantModel

