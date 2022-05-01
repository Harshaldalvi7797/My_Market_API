let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let productSubcategorySchema = new mongoose.Schema({
    productSubCategoryId: String,
    subCategoryId:
    {
        type: ObjectId,
        ref: "subCategoroes"

    },
    categoryId:
    {
        type: ObjectId,
        ref: "categories"
    },
    productId: {
        type: ObjectId,
        ref: "products"
    },
    active: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)
let productSubCategoryModel = mongoose.model("productSubcategories", productSubcategorySchema)
module.exports = productSubCategoryModel