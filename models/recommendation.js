let mongoose = require("mongoose")

let recommendationSchema = new mongoose.Schema({
    recommendationName: String,
    listOfProductVariants: [{ productVariantId: { type: 'ObjectId', ref: 'productVariants' } }],
    amazingOffers: []

},
    { timestamps: true }
)

let recommendationModel = mongoose.model('recommendations', recommendationSchema)

module.exports = recommendationModel