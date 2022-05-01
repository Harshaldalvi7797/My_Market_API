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
    let admin = await allModels.admin.findOne({
        "resetpasswordtoken": req.params.token,
        "resetpasswordexpire":
        {
            $gt: Date.now()
        }
    })
    if (!admin) { return res.status(403).send({ message: "invalid token or token got expires" }) }
    let oldpassword = await bcrypt.compare(req.body.password, admin.password);
    if (oldpassword) { return res.status(402).send({ message: "The new password matches your current password! Please set a new password" }) };
    
    admin.password = req.body.password;
    admin.resetpasswordexpire = undefined;
    admin.resetpasswordtoken = undefined;
    let salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);
    await admin.save();
    return res.send({ message: "your password has been updated successfully" })

}
