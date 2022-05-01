let allModels = require("../../../../utilities/allModels")
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


/* exports.addCurrencyDecimal = async (req, res) => {
      const validationError = validationResult(req);
      if (!validationError.isEmpty()) {
            return res.status(403).send({ message: validationError.array() });
      }

      let currencyDecimal = new allModels.currencyDecimal({
            currencyShort: req.body.currencyShort,
            currencyName: req.body.currencyName,
            currencyDecimal: req.body.currencyDecimal,
            active: true,
      });
      await currencyDecimal.save();

      return res.send({currencyDecimal});
} */