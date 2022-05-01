const mongoose = require('mongoose');
let { setDateTime } = require("./setDateTime")
let ngThis = this;

const settingsSchema = new mongoose.Schema({
    MM_Drive_Charges: {
        status: { type: Boolean, default: false },
        mmDriverCharges: { type: String, default: null },
        additionCharges: { type: String, default: null }
    },
    referral: {
        status: { type: Boolean, default: false },
        referalPercent: { type: String, default: null }
    }


}, { timestamps: true })

settingsSchema.pre('save', function (next) {

    if (!this.MM_Drive_Charges.status) { this.MM_Drive_Charges.status = false }
    if (!this.referral.status) { this.referral.status = false }

    next();
});

module.exports = mongoose.model('settings', settingsSchema);