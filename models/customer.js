let mongoose = require("mongoose")
let { setDateTime } = require("./setDateTime")
let ngThis = this;
const autoIncrement = require("mongoose-auto-increment");
let config = require("config");
let jwt = require("jsonwebtoken");
let customerSchema = new mongoose.Schema({
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    emailAddress: {
        type: String,
        unique: true
    },
    emailAddressVerified: {
        type: Boolean,
        default: false
    },
    tapCustomerId: {
        type: String,
        default: null
    },
    password: { type: String, default: null },
    mobilePhone: {
        type: String,
        unique: true
    },
    mobileCountryCode: {
        type: String
    },
    customerCountry: { type: String, default: null },
    mobilePhoneVerified: {
        type: Boolean,
        default: false
    },
    gender: { type: String, default: null },
    dateOfBirth: Date,
    guest: {
        type: Boolean,
        default: false
    },
    blockCustomer: {
        type: Boolean,
        default: false
    },
    otp: { type: String, default: null },
    referralCode: { type: String, default: null },
    referredBy: { type: String, default: null },
    imageFile: { type: String, default: null },
    defaultLanguage: { type: String, default: null },
    resetpasswordtoken: { type: String, default: null },
    resetpasswordexpire: Date,
    expireOtp: Date,
    defaultLanguage: { type: String, default: "english" },
    googleLoginId: { type: String, default: null },
    facebookLoginId: { type: String, default: null },
    active: {
        type: Boolean,
        default: true
    },
    createdDate: Number,
    updatedDate: Number
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        timestamps: true
    }
)

customerSchema.methods.UserToken = function () {
    let token = jwt.sign(
        { _id: this._id },
        //config.get("apitoken")
        process.env.JWT_SECRET

    );

    process.env.API_TOKEN = token;
    return token;
};

autoIncrement.initialize(mongoose.connection);

customerSchema.plugin(autoIncrement.plugin, {
    model: "customers", // collection or table name in which you want to apply auto increment
    field: "indexNo", // field of model which you want to auto increment
    startAt: 1000, // start your auto increment value from 1
    incrementBy: 1, // incremented by 1
});


customerSchema.pre('save', function (next) {
    if (!this.lastName || this.lastName == "" || this.lastName == null) {
        this.lastName = this.firstName
    } else {
        this.lastName = this.lastName
    }
    if (this.createdAt) {
        this.createdDate = setDateTime(this.createdAt)
    }
    if (this.updatedAt) {
        this.updatedDate = setDateTime(this.updatedAt)
    }

    next()
});


customerSchema.pre('save', function (next) {
    // console.log(this.customerCountry, this.indexNo, this._id)
    if (this.customerCountry) {
        this.customerCountry = this.customerCountry.replace(/ /g, "_").toUpperCase();
    }
    if (this.indexNo) {
        this.referralCode = this.indexNo.toString() + this._id.toString().substring(0, 5);
    }
    next();
});

customerSchema.virtual('fullName').get(function () {
    // console.log(`=> ${this.firstName} ${this.lastName}`);
    return `${this.firstName} ${this.lastName}`;
});

let customerModel = mongoose.model("customers", customerSchema)
module.exports = customerModel
