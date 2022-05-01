const allModels = require("./allModels");
const validateOffer = async (req, res, next) => {

    const today = new Date();
    let offer = await allModels.offerPricing.find({
        endDateTime: { $lt: today }
    });

    for (let index = 0; index < offer.length; index++) {
        const ele = offer[index];
        let a = await allModels.offerPricing.findOne({ _id: ele._id });
        a.active = false;
        await a.save();
    }
    next();
}