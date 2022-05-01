let express = require("express");
let { body, query } = require("express-validator");
let router = express.Router();
let {getInbox, sendMessage, getMessages, getSellerInbox , messageIsSeen} = require("../controllers/message");
const tokenVerify = require('../middlewares/tokenVerify');

router.post("/sendMessage", /* [
    body("toReceiverId").notEmpty().withMessage("Please enter the object Id of the person you want to send the message to ."),
    body("message").notEmpty().withMessage("Please enter the message you want to send"),
], */ tokenVerify, sendMessage);

router.get("/getMessages",[
    query('toReceiverId').notEmpty().withMessage("Please enter valid receiver id")
], tokenVerify, getMessages);

router.get("/getInbox", tokenVerify, getInbox);
router.get("/getSellerInbox", tokenVerify, getSellerInbox);

router.put("/message/seen", tokenVerify,messageIsSeen )

module.exports = router;

