let mongoose = require("mongoose")
const { ObjectId } = mongoose.Schema;
let productVariantImageSchema = new mongoose.Schema({
    productarientImageid:
    {
        type: String,
        default: mongoose.Types.ObjectId,
        index: { unique: true }
    },
    productVarientId:
    {
        type: ObjectId,
        ref: "productVariants"

    },
    photoFile: String,
    photoOrder: String,
    active: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)
let productVariantImageModel = mongoose.model("productVariantImages", productVariantImageSchema)
module.exports = productVariantImageModel