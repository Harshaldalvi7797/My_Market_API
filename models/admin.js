let mongoose = require("mongoose");
let jwt = require("jsonwebtoken");
const autoIncrement = require("mongoose-auto-increment");

let adminSchema = new mongoose.Schema({

  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  emailAddress: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  emailAddressVerified: {
    type: Boolean,
    default: false
  },
  otp: { type: String, default: null },
  mobileNumber: { type: String, defalt: null },
  mobileCountryCode: { type: String, defalt: null },
  active: { type: Boolean, defalt: false },
  expireOtp: Date,
  mobileVerified: {
    type: Boolean,
    default: false
  },
  role: { type: "ObjectId", ref: "roles", default: null },
  expireOtp: Date,
  resetpasswordtoken: String,
  resetpasswordexpire: Date,

}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});


autoIncrement.initialize(mongoose.connection);
adminSchema.plugin(autoIncrement.plugin, {
  model: "admins", // collection or table name in which you want to apply auto increment
  field: "indexNo", // field of model which you want to auto increment
  startAt: 1000, // start your auto increment value from 1
  incrementBy: 1, // incremented by 1
});

adminSchema.methods.adminToken = function () {
  let token = jwt.sign(
    { _id: this._id },
    //config.get("apitoken")
    process.env.JWT_SECRET

  );
  process.env.API_TOKEN = token;
  return token;
};

adminSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

let adminModel = mongoose.model("admins", adminSchema);
module.exports = adminModel;
