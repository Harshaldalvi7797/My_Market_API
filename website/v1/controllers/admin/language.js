const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");

addLanguage = async (req, res) => {
	try {
		const validationError = validationResult(req);
		if (!validationError.isEmpty()) {
			return res.status(403).send({ message: validationError.array() });
		}
		const language = new ALL_MODELS.language(req.body);
		language.save();
		return res.send({ message: "New language has been created.", language });
	} catch (error) {
		return res.status(500).send(error.message)
	}
};

getLanguages = async (req, res) => {
	try {
		const languages = await ALL_MODELS.language.aggregate([
			{
				$facet: {
					result: [
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
					totalCount: [{ $count: "totalCount" }],
				},
			},
		]);

		return res.send({
			languages: languages[0].result,
			count: languages[0].result.length,
			totalCount: languages[0].totalCount[0].totalCount,
		});
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

getLanguage = async (req, res) => {
	try {
		const languageId = req.params.id;
		let language = await ALL_MODELS.language.findOne({ _id: languageId });
		if (!language)
			return res.status(404).send({
				message: "There was no language found with given information!",
			});
		return res.send(language);
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

updateLanguage = async (req, res) => {
	try {
		const languageId = req.params.id;
		let language = await ALL_MODELS.language.findOne({ _id: languageId });
		if (!language)
			return res.status(404).send({
				message: "There was no language found with given information!",
			});
		const updateKeys = Object.keys(req.body);
		updateKeys.forEach((update) => (language[update] = req.body[update]));
		await language.save();
		return res.send({ message: "Language has been updated.", language });
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

deleteLanguage = async (req, res) => {
	try {
		const languageId = req.params.id;
		let language = await ALL_MODELS.language.findOneAndRemove({
			_id: languageId,
		});
		if (!language)
			return res.status(404).send({
				message: "There was no language found with given information!",
			});

		return res.send({ message: "Language has been deleted.", language });
	} catch (error) {
		return res.status(500).send({
			message: "Internal server error :(",
			systemErrorMessage: error.message,
		});
	}
};

module.exports = {
	addLanguage,
	getLanguage,
	updateLanguage,
	deleteLanguage,
	getLanguages,
};
