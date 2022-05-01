let mongoose = require("mongoose")
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
let brandSchema = new mongoose.Schema({
    brandDetails: [],
    brandThumbnailImage: String,
    brandCoverImage: String,
    active: {
        type: Boolean,
        default: null
    },
    adminApproval:
    {
        type: Boolean,
        default: false
    },
    createdDate: Number,
    updatedDate: Number
},
    { timestamps: true }
)

brandSchema.pre('save', function (next) {

    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }
    next()
});
autoIncrement.initialize(mongoose.connection);

brandSchema.plugin(autoIncrement.plugin, {
    model: "brands", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});
let brandModel = mongoose.model("brands", brandSchema)
module.exports = brandModel

//samsung