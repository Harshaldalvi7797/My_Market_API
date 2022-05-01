let express = require("express");
const { body, query } = require("express-validator");
const { addSettings, viewSettings

} = require("../../controllers/admin/settings");

const verifyAdmin = require("../../middlewares/verifyAdmin");
let router = express.Router();

router.post("/admin/create/settings", verifyAdmin, addSettings)

router.get("/admin/setting", verifyAdmin, viewSettings)
module.exports = router