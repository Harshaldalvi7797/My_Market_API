const allModels = require('../utilities/allModels')

const personalInfoGet = async (req, res) => {
  let user = await allModels.customer.findOne({ _id: req.userId });
  return res.status(201).send(user);
}

module.exports = {
  personalInfoGet
}
