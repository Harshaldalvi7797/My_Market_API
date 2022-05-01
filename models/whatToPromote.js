const mongoose = require("mongoose");
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const advertisementCampaignSchema = new mongoose.Schema({
    adminId: { type: 'ObjectId', ref: "admins" },
    name: { type: String, required: true },
    isId: { type: Boolean, default: false },
    active: {
        type: Boolean,
        default: false
    },
    adminApproval: { type: Boolean, default: false }
}, { timestamps: true })
const advertisementCampaign = mongoose.model("whatToPromote", advertisementCampaignSchema);
module.exports = advertisementCampaign;


//'23984203', 'Brand', true
//'23984203', 'Category', true
//          , 'ProductVariant', true
//          , 'Product', true
//'23984203', 'NewArival', false
//'23984203', 'Trending', false


