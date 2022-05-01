//Third party package
const allModels = require("./../utilities/allModels");

const isCustomer = async (req, res, next) => {
    //console.log(req.userId);

    let customer = await allModels.customer.findById(req.userId)
    if (!customer) {
        return res.status(403).send({ 'message': 'Invalid customer' });
    }
    req.customer = customer
    next();

};//End of function


module.exports = isCustomer;

