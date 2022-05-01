let allModels = require("../../../../utilities/allModels")
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");


exports.addSettings = async (req, res) => {

    let { type, status, mmDriverCharges, additionCharges, referalPercent } = req.body
    let settingCheck = await allModels.settingModel.findOne()

    let MM_Drive_Charges = {};
    let referral = {};


    if (!settingCheck) {
        if (type == 'referral') {
            referral = {
                status: status || false,
                referalPercent: referalPercent
            }
        } else if (type == 'mmdrivecharges') {
            MM_Drive_Charges = {
                status: status || false,
                mmDriverCharges: mmDriverCharges,
                additionCharges: additionCharges
            }
        }

        let settings = new allModels.settingModel(
            {
                MM_Drive_Charges: MM_Drive_Charges,
                referral: referral
            }
        )
        let data = await settings.save()
        return res.send({ message: "Settings has been added", data: data })
    } else {
        if (type == 'referral') {
            referral = {
                status: status,
                referalPercent: referalPercent || settingCheck.referral.referalPercent
            };
            settingCheck.referral = referral;
        } else if (type == 'mmdrivecharges') {
            MM_Drive_Charges = {
                status: status,
                mmDriverCharges: mmDriverCharges || settingCheck.MM_Drive_Charges.mmDriverCharges,
                additionCharges: additionCharges || settingCheck.MM_Drive_Charges.additionCharges
            }
            settingCheck.MM_Drive_Charges = MM_Drive_Charges;
        }

        let data = await settingCheck.save();
        return res.send({ message: "Settings have been updated", data: data })
    }
}

exports.viewSettings = async (req, res) => {
    try {
        let setting = await allModels.settingModel.find()
        return res.send({ data: setting })
    }
    catch (error) {
        return res.status(403).send({ message: error.message })
    }
}

