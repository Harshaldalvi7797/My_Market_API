let allModels = require("../../../../utilities/allModels")
//let mailService = require("../../v1/middlewares/mailService");

exports.contactUs = async (req, res) => {
    let reqData = req.body;

    const newForm = new allModels.contactUs({
        name: reqData.name,
        emailAddress: reqData.emailAddress,
        mobilePhone: reqData.mobilePhone,
        message: reqData.message
    });

    let new_form = await newForm.save();

    // Will be configured later
    // let mailBody = {
    //     'emailId' : req.body.emailAddress,
    //     'subject' : 'Thank You for getting in touch with us!',
    //     'message' : 'You will be hearing back from us shortly!'
    // };  
    // req.mailBody = mailBody;
    // await mailService.sendMail(req, res);

    return res.send({ message: "Thank you for getting in touch with us!", data: new_form });

}

exports.getContact = async (req, res) => {
    let contacts = await allModels.contactUs.find()
    return res.send({ count: contacts.length, data: contacts })
}