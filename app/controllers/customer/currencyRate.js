let allModels = require("../../utilities/allModels")
const { validationResult } = require('express-validator')

exports.getCurrencyConversionRate = async (req, res) => {
      const validationError = validationResult(req);
      if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
      }

      let currency = await allModels.currency.findOne({
            //$or: [{
            "conversionRate.to.currencyShort": req.query.toCurrency//new RegExp(req.query.toCurrency, "i")
            //}, { "currencyDetails.countryName": new RegExp(req.query.toCurrency, "i") }
            //]
      }).select(["conversionRate", "-_id"]);

      return res.send({ data: currency });
}

