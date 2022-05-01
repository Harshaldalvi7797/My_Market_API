//Third party package
const allModels = require('./../../../utilities/allModels');

const isSeller = async (req, res, next) => {
    let seller = await allModels.seller.findById(req.userId)
    if (!seller) {
        return res.status(402).send({ 'message': 'Invalid seller' });
    }
    req.seller= seller
    next();

};//End of function


module.exports = isSeller;

