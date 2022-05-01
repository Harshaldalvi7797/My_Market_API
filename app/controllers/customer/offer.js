const allModels = require("../../../utilities/allModels");

exports.getOffers = async ( req, res, next) => {

    const { _id, link } = req.query;

    try {
        const findQuery = {active: true};

        const offers = await allModels.offerLink.aggregate([
            { $match: findQuery },
            {
                $project: {
                    offerDetails: 1, offerLink: 1,
                    page: "product-variant",
                    id: "100",
                    // website : {
                    //     page: "/home",
                    //     arguments: {id: "606ebbf61d6cd1211abfc3b8"},
                    //     endpoint: "mmapi.datavivservers.in/app/offer"
                    // },
                    app : {
                        screen: "/home",
                        arguments: {id: "606ebbf61d6cd1211abfc3b8"},
                        endpoint: "mmapi.datavivservers.in/app/offer"
                    }
                }
            }
        ]);
    
    
        return res.status(offers.length ? 200 : 204).json({ data: offers });

    } catch(error) { return res.status(403).send({ message: error.message }); }
    
}// End of getOffers method