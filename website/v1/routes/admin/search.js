let express = require("express");
const { getProducts } = require("../../controllers/admin/search");
const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.get("/admin/search/products", verifyAdmin, getProducts);

module.exports = router;
