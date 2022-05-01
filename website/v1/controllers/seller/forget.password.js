let express = require("express");
let router = express.Router();
let allModels = require("../../../../utilities/allModels")
let bcrypt = require("bcrypt");
const { validationResult } = require('express-validator');

exports.forgetPassword = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let seller = await allModels.seller.findOne({
        "resetpasswordtoken": req.params.token,
        "resetpasswordexpire":
        {
            $gt: Date.now()
        }
    })
    if (!seller) { return res.status(403).send({ message: "invalid token or token got expires" }) }
    let oldpassword = await bcrypt.compare(req.body.password, seller.password);
    if (oldpassword) { return res.status(402).send({ message: "The new password matches your current password! Please set a new password" }) };
    seller.password = req.body.password;
    seller.resetpasswordexpire = undefined;
    seller.resetpasswordtoken = undefined;
    let salt = await bcrypt.genSalt(10);
    seller.password = await bcrypt.hash(seller.password, salt);
    await seller.save();
  return res.send({ message: "your password has been updated successfully" })

}
