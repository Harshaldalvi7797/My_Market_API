let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
let { getInbox, sendMessage, getMessages ,archivemessage} = require("../../controllers/customer/message");
const tokenVerify = require('../../middlewares/tokenVerify');


router.put("/app/customer/archive",tokenVerify, archivemessage)
router.post("/app/sendMessage", [
    body("toReceiverId").notEmpty().withMessage("Please enter the object Id of the person you want to send the message to .")

    
    // body("message").notEmpty().withMessage("Please enter the message you want to send"),
], tokenVerify, sendMessage);

router.get("/app/getMessages", [
    query('toReceiverId').notEmpty().withMessage("Please enter valid receiver id")
], tokenVerify, getMessages);

router.get("/app/getInbox", tokenVerify, getInbox);

module.exports = router;

