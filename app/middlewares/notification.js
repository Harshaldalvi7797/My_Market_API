let allModels = require("../../utilities/allModels");
let mailer = require("./mailService");

exports.addNotification = async (userId, id, type, notificationTitle, receiveOn, eventId) => {

      //  console.log("userId6", userId)
      //send notification to
      let isCustomer = await allModels.customer.findOne({ _id: id });
      let isAdmin = await allModels.admin.findOne({ _id: id });
      let isSeller = await allModels.seller.findOne({ _id: id });

      //by user
      let byCustomer = await allModels.customer.findOne({ _id: userId });
      let byAdmin = await allModels.admin.findOne({ _id: userId });
      let bySeller = await allModels.seller.findOne({ _id: userId });

      let customerId = isCustomer ? id : null;
      let adminId = isAdmin ? id : null;
      let sellerId = isSeller ? id : null;

      // console.log(byCustomer, byAdmin, bySeller);
      if (byCustomer || byAdmin || bySeller) {
            if (notificationTitle.toLowerCase() == "new message") {
                  notificationTitle += ' from ' + ((byCustomer != null) ? byCustomer['firstName'] + ' (Customer)' : ((bySeller != null) ? bySeller['nameOfBussiness'] + ' (Seller)' : (byAdmin != null) ? byAdmin['firstName'] + ' (My Market)' : null));
            } else if (notificationTitle.toLowerCase() == "new order placed") {
                  notificationTitle += ' by ' + byCustomer['firstName'] + ' with UserId: ' + byCustomer['_id'];
            }

            let notification = new allModels.notification({
                  customerId: customerId,
                  adminIds: adminId,
                  sellerId: sellerId,
                  notificationType: type,
                  notificationFrom:userId,
                  notificationTypeId: eventId,  //eventId
                  notificationNameEnglish: notificationTitle,
                  notificationNameArabic: notificationTitle,
                  notificationReceiveOn: receiveOn//"website"
            });

            //  console.log(notification)
            await notification.save();

            if (receiveOn == 'email') {
                  //notification to
                  let mail = {
                        mailBody: {
                              emailId: isCustomer ? isCustomer['emailAddress'] : (isSeller ? isSeller['emailAddress'] : isAdmin ? isAdmin['emailAddress'] : null),
                              subject: notificationTitle,
                              message: notificationTitle
                        }
                  }
                  //console.log("mail sent 1", notificationTitle.toLowerCase().includes("message"));
                  mailer.sendMail(mail, null);

                  if (!notificationTitle.toLowerCase().includes("new message")) {
                        //notification form
                        mail = {
                              mailBody: {
                                    emailId: ((byCustomer != null) ? byCustomer['emailAddress'] : ((bySeller != null) ? bySeller['emailAddress'] : (byAdmin != null) ? byAdmin['emailAddress'] : null)),
                                    subject: notificationTitle,
                                    message: notificationTitle
                              }
                        }
                        // console.log("mail sent 2");

                        mailer.sendMail(mail, null);
                  }
            }
            if (receiveOn == 'sms') { }
      }

      return;
}

