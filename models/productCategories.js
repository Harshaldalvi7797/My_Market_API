const mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
const productCategorySchema = new mongoose.Schema({
    productCategoryId: String,
   
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
const productCategory = mongoose.model("productCategory", productCategorySchema)
module.exports = productCategory;
 