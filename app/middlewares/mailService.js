var nodemailer = require('nodemailer');


let sendMail = async (req, res) => {
    let transporter = nodemailer.createTransport({
        // host: "mailer.datavivservers.in",
        host: "smtp.eu.mailgun.org",
        port: 587,
        secure: false, // true for 465, false for other ports

        auth: {
            // user: "no-reply@send.mymrkt.work", // generated ethereal user
            user: "postmaster@send.mymrkt.work", // generated ethereal user
            // pass: "iMcdPcv75pruF3dsadasdasd!wdn" // generated ethereal password
            pass: "7680c395cac53ca4510884a4686b41d9-054ba6b6-704dfe02" // generated ethereal password
        },
        tls: { rejectUnauthorized: false },
        debug: true
    });

    let mailOptions = {
        from: '"MyMarketplace" <no-reply@send.mymrkt.work>', // sender address
        // @ts-ignore
        to: req.mailBody.emailId, // list of receivers
        subject: req.mailBody.subject, // Subject line:smile:
        text: req.mailBody.message
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

let sendSMS= async (req,res)=>
{
    
}


module.exports = { sendMail: sendMail };
