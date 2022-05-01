
let allModels = require("../../../../utilities/allModels")
const { validationResult } = require('express-validator');
exports.manageAddressPost = async (req, res) => {
    try {
        const validationError = validationResult(req);
        if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
        }
        const localAddress = new allModels.customerAddress({
            customerId: req.userId,
            addressName: req.body.addressName,

            addressType: req.body.addressType,
            contactNumber: req.body.ContactNumber,
            addressLine1: req.body.addressLine1,
            addressLine2: req.body.addressLine2 || null,
            addressLine3: req.body.addressLine3 || null,
            city: req.body.city,
            state: req.body.state || null,
            country: req.body.country,
            pincode: req.body.pincode,
            poBox: req.body.poBox || null,
            blockNumber: req.body.blockNumber || null,
            postCode: req.body.postCode || null,
        });
        //console.log(localAddress);
        const address = await localAddress.save();
        return res.status(201).send(address);
    } catch (e) {
        return res.status(400).send(e);
    }
}

exports.manageAddressGet_customerId = async (req, res) => {
    try {
        let FetchAddress = await allModels.customerAddress.find({ customerId: req.userId });
        if (!FetchAddress) {
            return res.status(404).send({ message: "Invalid address Id" });
        }
        return res.send({ data: FetchAddress });

    }
    catch (err) {
        return res.status(400).send(err);
    }
}

exports.manageAddressIdGet = async (req, res) => {
    try {
        let FetchAddress = await allModels.customerAddress.findOne({
            _id: req.params.id,
            customerId: req.userId
        });
        if (!FetchAddress) {
            return res.status(404).send({ message: "Invalid address Id" });
        }
        return res.send({ data: FetchAddress });
    }
    catch (err) {
        return res.status(400).send(err);
    }
}

exports.manageAddressPut = async (req, res) => {
    // allModels.customerAddress.findByIdAndUpdate({ _id: req.body.id }, {
    allModels.customerAddress.findOneAndUpdate({ _id: req.body.id, customerId: req.userId }, {
        addressName: req.body.addressName,
        addressType: req.body.addressType,
        isDefault: req.body.isDefault,
        contactNumber: req.body.ContactNumber,
        addressLine1: req.body.addressLine1,
        addressLine2: req.body.addressLine2,
        addressLine3: req.body.addressLine3,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        pincode: req.body.pincode,
        poBox: req.body.poBox,
        blockNumber: req.body.blockNumber,
        postCode: req.body.postCode,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        active: req.body.active

    }, { new: true }, (err, data) => {
        if (err) {
            return res.status(400).send(err);
        }
        else {
            return res.status(201).send(data);
        }
    })
}

exports.manageAddressDelete = async (req, res) => {
    try {
        const removeAddress = await allModels.customerAddress.findOneAndRemove({
            _id: req.params.id,
            customerId: req.userId
        });
        return res.send({ message: "customer Address Deleted!" })

    }
    catch (err) {
        return res.status(400).send(err);
    }
}