const aramex = require("./../../middlewares/aramex");
const { validationResult } = require('express-validator');

exports.validateAddress = async (req, res) => {
      const validationError = validationResult(req)
      if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
      }

      const { Line1, Line2, City, PostCode, CountryCode } = req.body;
      let address = {
            Line1: Line1,
            Line2: Line2,
            City: City,
            PostCode: PostCode || "",
            CountryCode: CountryCode
      };
      let checkValidation = await aramex.validateAddress(address);
      if (checkValidation.HasErrors) {
            return res.status(403).send({ message: checkValidation.Notifications[0].Message });
      }
      return res.send({ message: "Address validated successfully" });
}