let allModels = require("../../../utilities/allModels");
let mailer = require("./mailService");
let sms = require("./sendSMS");
let notificationData = require("./../middlewares/notificationData.json");

exports.sendNotification = async (req, senderId, receiverId, notificationId, data, type, eventId) => {
      let selectedNotification = null;
      selectedNotification = notificationId

      let a = await notificationData.findIndex(x => x.id === selectedNotification);

      let notification = null;
      if (a != -1) {
            notification = notificationData[a];
      }
      else {
            return console.log("Invalid notificationId")
      }

      //send notification to (receiver)
      var receiver = null
      var customerId = adminId = sellerId = null
      if (notification.userType == 'Customer') {
            receiver = await allModels.customer.findOne({ _id: receiverId });
            customerId = receiver ? receiverId : null
      }
      else if (notification.userType == 'Admin') {
            receiver = await allModels.admin.findOne({ _id: receiverId });
            adminId = receiver ? receiverId : null
      }
      else if (notification.userType == 'Seller') {
            receiver = await allModels.seller.findOne({ _id: receiverId });
            sellerId = receiver ? receiverId : null
      }

      if (!receiver && notification.businessEvents == 'Suggest New Idea') {
            receiver = data
      }
      if (!receiver && notification.businessEvents == 'Newsletter') {
            receiver = data
      }
      if (!receiver && notification.businessEvents == 'Reset Password') {
            receiver = data
      }

      //by user (sender)
      let byCustomer = await allModels.customer.findOne({ _id: senderId });
      let byAdmin = await allModels.admin.findOne({ _id: senderId });
      let bySeller = await allModels.seller.findOne({ _id: senderId });

      let sender = byCustomer ? byCustomer : byAdmin ? byAdmin : bySeller ? bySeller : null

      if (receiver) {
            let message = await FormateMessage(data, notification.messageEnglish, notification.messageArabic)

            if (notification.sendEmail == true) {
                  data.emailFrom = notification.emailFrom
                  data.emailId = receiver.emailAddress

                  if (receiver.defaultLanguage && receiver.defaultLanguage.toLowerCase() == "english") {
                        //English email
                        data.subject = notification.notificationSubjectEnglish ? notification.notificationSubjectEnglish : notification.businessEvents
                        html = await require('../../../' + notification.emailPathEnglish)(req, data);
                        data.emailMessage = html
                        sendEMail(data);
                  } else if (receiver.defaultLanguage && receiver.defaultLanguage.toLowerCase() == "arabic") {
                        //Arabic email
                        data.subject = notification.notificationSubjectArabic ? notification.notificationSubjectArabic : notification.businessEvents
                        html1 = await require('../../../' + notification.emailPathArabic)(req, data);
                        data.emailMessage = html1
                        sendEMail(data);
                  } else {
                        //English email
                        data.subject = notification.notificationSubjectEnglish ? notification.notificationSubjectEnglish : notification.businessEvents
                        html = await require('../../../' + notification.emailPathEnglish)(req, data);
                        data.emailMessage = html
                        sendEMail(data);

                        //Arabic email
                        data.subject = notification.notificationSubjectArabic ? notification.notificationSubjectArabic : notification.businessEvents
                        html1 = await require('../../../' + notification.emailPathArabic)(req, data);
                        data.emailMessage = html1
                        sendEMail(data);
                  }
            }
            if (notification.sendSms == true) {
                  data.toNumber = receiver.mobileNumber ? receiver.mobileNumber : receiver.mobilePhone

                  if (receiver.defaultLanguage && receiver.defaultLanguage.toLowerCase() == "english") {
                        //for English
                        data.smsMessage = message.englishMessage
                        sendSms(data, receiver);
                  } else if (receiver.defaultLanguage && receiver.defaultLanguage.toLowerCase() == "arabic") {
                        //for Arabic
                        data.smsMessage = message.arabicMessage
                        sendSms(data, receiver);
                  } else {
                        //for English
                        data.smsMessage = message.englishMessage
                        sendSms(data, receiver);

                        //for Arabic
                        data.smsMessage = message.arabicMessage
                        sendSms(data, receiver);
                  }
            }
            if (notification.sendPlatform == true) {
                  let notificationReceiveOn = 'website'
                  // console.log(message.englishMessage)
                  let notification1 = new allModels.notification({
                        customerId: customerId,
                        adminIds: adminId,
                        sellerId: sellerId,
                        notificationType: type,
                        notificationFrom: senderId,
                        notificationTypeId: eventId,
                        notificationNameEnglish: message.englishMessage,
                        notificationNameArabic: (message && message.arabicMessage) ? message.arabicMessage : message.englishMessage,
                        notificationReceiveOn: notificationReceiveOn
                  });
                  await notification1.save();

            }
      }
}

const sendEMail = async (data) => {
      let options = {}
      //parameters emailId, subject, message
      options.mailBody = {
            emailFrom: data.emailFrom, //mail from
            emailId: data.emailId, //mail to
            subject: data.subject, //mail subject
            message: data.emailMessage //mail message in html format
      }

      mailer.sendMail(options, null)
}

const sendSms = async (data, receiver) => {
      // console.log("================================");
      // console.log(JSON.stringify(receiver));
      //console.log("================================");

      //for customer
      if (receiver && receiver.mobilePhone && receiver.mobileCountryCode) {
            data.toNumber = `${receiver.mobileCountryCode}${receiver.mobilePhone}`
            // console.log(data.toNumber)
      }//for seller
      else if (receiver && receiver.mobilePhone && receiver.countryCode) {
            data.toNumber = `${receiver.countryCode}${receiver.mobilePhone}`
      }//for admin
      else if (receiver && receiver.mobileNumber && receiver.mobileCountryCode) {
            data.toNumber = `${receiver.mobileCountryCode}${receiver.mobileNumber}`
      }

      //parameters req.toNumber, req.message 
      let options = {
            toNumber: data.toNumber,
            message: data.smsMessage
      }
      sms.sendSMS(options, null, null);
}

const FormateMessage = async (data, messageEnglish, messageArabic) => {
      messageEnglish = messageEnglish.replace(/\${username}/g, data.customername);
      messageEnglish = messageEnglish.replace(/\${seller name}/g, data.sellername);
      messageEnglish = messageEnglish.replace(/\${product name}/g, data.productname);
      messageEnglish = messageEnglish.replace(/\${order number}/g, data.ordernumber);
      messageEnglish = messageEnglish.replace(/\${tracking number}/g, data.trackingnumber);
      messageEnglish = messageEnglish.replace(/\${otp}/g, data.otp);
      messageEnglish = messageEnglish.replace(/\${amount}/g, data.amount);
      messageEnglish = messageEnglish.replace(/\${subscription number}/g, data.subscriptionnumber);
      messageEnglish = messageEnglish.replace(/\${brand name}/g, data.brandname);
      messageEnglish = messageEnglish.replace(/\${admin name}/g, data.adminname);
      messageEnglish = messageEnglish.replace(/\${role name}/g, data.rolename);
      messageEnglish = messageEnglish.replace(/\${emailId}/g, data.emailId);
      messageEnglish = messageEnglish.replace(/\${customer number}/g, data.customernumber);
      messageEnglish = messageEnglish.replace(/\${rating}/g, data.rating);

      messageArabic = messageArabic.replace(/\${username}/g, data.customername);
      messageArabic = messageArabic.replace(/\${seller name}/g, data.sellername);
      messageArabic = messageArabic.replace(/\${product name}/g, data.productname);
      messageArabic = messageArabic.replace(/\${order number}/g, data.ordernumber);
      messageArabic = messageArabic.replace(/\${tracking number}/g, data.trackingnumber);
      messageArabic = messageArabic.replace(/\${otp}/g, data.otp);
      messageArabic = messageArabic.replace(/\${amount}/g, data.amount);
      messageArabic = messageArabic.replace(/\${subscription number}/g, data.subscriptionnumber);
      messageArabic = messageArabic.replace(/\${brand name}/g, data.brandname);
      messageArabic = messageArabic.replace(/\${admin name}/g, data.adminname);
      messageArabic = messageArabic.replace(/\${role name}/g, data.rolename);
      messageArabic = messageArabic.replace(/\${emailId}/g, data.emailId);
      messageArabic = messageArabic.replace(/\${customer number}/g, data.customernumber);
      messageArabic = messageArabic.replace(/\${rating}/g, data.rating);

      data = { englishMessage: messageEnglish, arabicMessage: messageArabic }

      return data;
}

const newMessageNotificationUpdateTitle = async (notification, isCustomer, isAdmin, isSeller, selectedUser) => {
      if (isCustomer || isAdmin) {
            notification.messageEnglish = notification.messageEnglish.replace(/\${(.+?)\}/g, selectedUser.fullName);
      } else if (isSeller) {
            notification.messageEnglish = notification.messageEnglish.replace(/\${(.+?)\}/g, selectedUser.nameOfBussiness);
      }

      return notification
}

