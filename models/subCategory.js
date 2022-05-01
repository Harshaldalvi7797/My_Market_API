let mongoose = require("mongoose")
let subCategorySchema = new mongoose.Schema({
    categoryId:
    {
        type: String,
        default: mongoose.Types.ObjectId,
        index: { unique: true }
    },
    subCategoryDetails: [],
    active: {
        type: Boolean,
        default: false
    },
    subCategoryCoverImage: String,
    subCategoryThumbnailImage: String
},
    { timestamps: true }
)
let subCategoryModel = mongoose.model("subCategoroes", subCategorySchema)
module.exports = { subCategoryModel }