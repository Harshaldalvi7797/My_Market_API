// Third party modules
const { ObjectId, } = require("mongoose").Types;

const allModels = require('../utilities/allModels')



exports.manageAddressPost = async (req, res) => {
     try {
          const localAddress = new allModels.customerAddress({
               customerId: req.body.customerId,
               addressName: req.body.addressName,

               addressType: req.body.addressType,
               contactNumber: req.body.contactNumber,
               addressLine1: req.body.addressLine1,
               addressLine2: req.body.addressLine2,
               addressLine3: req.body.addressLine3,
               city: req.body.city,
               state: req.body.state,
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

// Use to fetch customer addresses and single addres based on address id
exports.getCustomerAddress = async (req, res) => {
     try {
          const { id } = req.query;
          const customerId = ObjectId(req.userId);
          const findQuery = { customerId: customerId };
          // For fetching single record
          if (id) {
               const isValid = ObjectId.isValid(id);
               //console.log(isValid);
               if (!isValid) {
                    return res.status(422).json({
                         message: "Valid id is required, please check your id your passing.",
                         payload: {
                              id
                         },
                         location: "query"
                    });
               }
               findQuery._id = ObjectId(id);
          }

          const addresses = await allModels.customerAddress.find(findQuery);
          return res.status(addresses.length ? 200 : 204).json({ data: addresses.length ? addresses : "No address found" });

     } catch (error) {
          return res.status(500).json({
               message: error.message
          });
     }

}// End of getCustomerAddress method


exports.manageAddressPut = async (req, res) => {
     allModels.customerAddress.findByIdAndUpdate({ _id: req.body.id }, {
          addressName: req.body.addressName,
          addressType: req.body.addressType,
          isDefault: req.body.isDefault,
          contactNumber: req.body.contactNumber,
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
          const removeAddress = await allModels.customerAddress.findByIdAndRemove(req.params.id);
          return res.send({ message: "Customer Address Deleted!" })

     }
     catch (err) {
          return res.status(400).send(err);
     }
}