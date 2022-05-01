const { fetchCities } = require("./../../middlewares/aramex");

exports.fetchCitiesList = async (req, res) => {
      const { countryCode } = req.query;
      if (!countryCode) {
            return res.status(403).send({ message: "Please enter valid countryCode" });
      }

      let citiesList = await fetchCities(countryCode);
      if (citiesList.HasErrors) {
            return res.send({ message: citiesList.Notifications[0].Message });
      }

      return res.send({ data: citiesList });
}