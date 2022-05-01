let mongoose = require("mongoose");
const Schema = mongoose.Schema
const autoIncrement = require("mongoose-auto-increment");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
// const policyName = ['Terms & Conditions', 'Privacy Policy', 'Return Policy']
const detailsSchema = new Schema({
    details: [
        // { language: { type: String } },
        // { policyName: { type: String, enum: policyName } },
        // { policyDescription: { type: String } }
    ],
    type: {
        type: String,
        enum: ['Terms & Conditions', 'Privacy Policy', 'Return Policy', 'FAQ', 'About Us', 'Delivery Terms'],
    },
    active: {
        type: Boolean,
        default: false
    },
    isCustomer: {
        type: Boolean,
        default: false
    },
    isSeller: {
        type: Boolean,
        default: false
    }
})
autoIncrement.initialize(mongoose.connection);

detailsSchema.plugin(autoIncrement.plugin, {
    model: "details", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});

detailsSchema.pre('save', function (next) {
    // console.log(this.indexNo);

    next()
});

let detailsModel = mongoose.model('details', detailsSchema);
module.exports = detailsModel