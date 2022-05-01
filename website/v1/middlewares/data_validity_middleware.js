// Third party moudles
const { validationResult } = require("express-validator");

const data_validity_middleware = async ( req, res, next ) => {

	console.log("validating data...")

	try {
		const validationError = validationResult(req);

		if (!validationError.isEmpty()) {
			return res.status(403).send({ message: validationError.array() });
		}

        next();

    } catch( error ) { return res.status(403).send({ message: error.message }); }

}// End of data_validity_middleware method


module.exports = data_validity_middleware;