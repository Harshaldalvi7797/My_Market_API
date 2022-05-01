// Local modules
const ALL_MODELS = require("../../../../../utilities/allModels");

const filterSeller = async (req, res) => {
	let { search, limit, page } = req.body;

	if (!limit) {
		limit = 10;
	}
	if (!page) {
		page = 1;
	}

	let perPage = parseInt(limit);
	let pageNo = Math.max(0, parseInt(page));

	if (pageNo > 0) {
		pageNo = pageNo - 1;
	} else if (pageNo < 0) {
		pageNo = 0;
	}

	try {
		let Searchfilter = {};

		if (search) {
			const regexp = new RegExp(search, "i");

			Searchfilter["$or"] = [
				{ "productVariantDetails.productVariantName": regexp },
			];
		}

		// Fetching sale
		const seller = await ALL_MODELS.seller.aggregate([
			// lookup
			{
				$project: {
					sellerfName: "$sellerDetails.sellerfName",
					sellerlName: "$sellerDetails.sellerlName"
				},
			},
			{
				$facet: {
					paginatedResults: [
						{
							$skip: perPage * pageNo,
						},
						{
							$limit: perPage,
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
		let totalCount = 0;
		try {
			totalCount = seller[0].totalCount[0].count;
		} catch (err) {}

		return res.json({
			totalCount: totalCount,
			data: seller.length ? seller[0].paginatedResults : [],
			pageNo: pageNo,
		});
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

const filterCountry = async (req, res) => {
try {
	res.json({
		data: [
			"Bahrain",
			"Kuwait",
			"Oman",
			"Qatar",
			"Saudi Arabia",
			"United Arab Emirates",
		],
	});
} catch (error) {
	return res.status(403).send({ message: error.message });
}
};

module.exports = { filterSeller, filterCountry };
