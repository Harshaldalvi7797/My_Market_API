let express = require("express");
let router = express.Router();
const { fetchCitiesList } = require("../../controllers/common/fetchCities");

router.get("/fetchCities", fetchCitiesList)



module.exports = router
