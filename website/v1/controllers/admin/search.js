const ALL_MODELS = require("../../../../utilities/allModels");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

// sellerId:"604f6d4a58d7b43b817f7671"

getProducts = async (req, res) => {
	try {
		let products = await ALL_MODELS.productVariant.aggregate([
			{
				$match: {
					sellerId: ObjectId(req.userId),
				},
			},
			// Search Params
			...(req.query.search
				? [
						{
							$match: {
								productSKU: {
									$regex: req.query.search,
								},
							},
						},
				  ]
				: []),
			// // Price Range
			// ...(req.query.range
			// 	? [
			// 		{ "$match": {
			// 			productNetPrice: { "$gt": 0, "$lt": 150 }
			// 		}}
			// 	  ]
			// 	: []),
			{
				$facet: {
					paginatedResults: [
						{
							$skip:
								!req.query.skip || req.query.skip == 0
									? 0
									: parseInt(req.query.skip),
						},
						{
							$limit:
								!req.query.limit || req.query.limit == 0
									? 5
									: parseInt(req.query.limit),
						},
					],
					totalCount: [
						{
							$count: "count",
						},
					],
				},
			},
		]);

		let count = (products[0].totalCount.length>0)?products[0].totalCount[0].count:0
		return res.send({ count: count, data: products[0].paginatedResults });
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

module.exports = {
	getProducts,
};
