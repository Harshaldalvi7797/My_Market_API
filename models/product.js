let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
const { ObjectId } = mongoose.Schema;
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");


let productsSchema = new mongoose.Schema({

    // productCategories: [{ categoryId: { type: ObjectId, ref: "categories" }, active: Boolean }],
    productCategories: [
        {
            categoryLevel1Id: { type: ObjectId },
            categoryLevel2Id: { type: ObjectId },
            categoryLevel3Id: { type: ObjectId, default: null },
            active: {
                type: Boolean,
                default: false
            }
        }
    ],
    productDetails: [],
    // tags: [],
    tags: [
        { language: "", name: [] },
        { language: "", name: [] },
    ],
    adminApproval:
    {
        type: Boolean,
        default: false

    },
    activeWeb:
    {
        type: Boolean,
        default: false

    },
    activeSeller:
    {
        type: Boolean,
        default: false

    },
    brandId:
    {
        type: ObjectId,
        ref: "brands",
    },
    productSpecifications: [],
    active:
    {
        type: Boolean,
        default: false
    },
    productDate: Number,
    productUpdateDate: Number,

},
    { timestamps: true }
)
productsSchema.pre('save', function (next) {
    if (this.productDate) {
        this.productDate = setDateTime(this.createdAt)
    }
    if (this.productUpdateDate) {
        this.productUpdateDate = setDateTime(this.updatedAt)
    }
    next()
});

autoIncrement.initialize(mongoose.connection);

productsSchema.plugin(autoIncrement.plugin, {
    model: "products", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

let productModel = mongoose.model("products", productsSchema)
module.exports = productModel

//Samsung Galaxy 
