let express = require("express");
let router = express.Router();
const {
    createWhatToPromote
} = require("../../controllers/common/whatToPromote");
const verifyAdmin = require("../../middlewares/verifyAdmin");

router.post("/admin/create/whattopromote", verifyAdmin, createWhatToPromote)



module.exports = router
