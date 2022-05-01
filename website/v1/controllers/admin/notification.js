// core modules
const path = require("path");


// local modules
const all_models = require(path.join(__dirname, "..", "..", "..", "..", "utilities", "allModels"));
const remove_null_keys = require(path.join(__dirname, "..", "..", "..", "..", "utilities", "remove_null_keys"));
const upload = require(path.join(__dirname, "..", "..", "middlewares", "AdminfileUpload"));



exports.insert_notification = async (req, res, next) => {

    const {
        customerId, adminIds, sellerId,
        notificationType, notificationNameEnglish, notificationNameArabic, notificationReceiveOn,
        isNotificationSent = false, deviceId,
    } = req.body;

    try {

        const newNotification = new all_models.notification({
            customerId,
            adminIds: adminIds ? adminIds.toString().split(",") : null,
            sellerId,
            notificationType, notificationNameEnglish, notificationNameArabic, notificationReceiveOn,
            isNotificationSent,
            seenBy: null,
            deviceId,
        });

        const { _id } = await newNotification.save();

        return res.send({
            _id,
            message: "Notification added successfully"
        });


    } catch (error) { return res.status(403).send({ message: error.message }); }



};// End of insert_notification method


exports.fetch_notification = async (req, res, next) => {

    try {
        const slider = await all_models.notification.aggregate([
            { $sort: { createdAt: -1 } }
        ]);

        return res.json({
            data: slider,
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of fetch_notification method


exports.update_notification = async (req, res, next) => {

    const { _id, isNotificationSent, seenBy, deviceId, } = req.body;
    try {
        const data = remove_null_keys({
            isNotificationSent, seenBy, deviceId
        });

        const { nModified } = await all_models.notification.updateOne(
            { _id },
            { $set: data }
        );

        return res.json({
            message: nModified ? "Updated successfully" : "Already updated."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of update_notification method



exports.delete_notification = async (req, res, next) => {

    try {
        const { _id } = req.params;

        const { n: isDeleted } = await all_models.notification.deleteOne({ _id });

        return res.status(isDeleted ? 200 : 404).json({
            message: isDeleted ? "Notification has been removed successfully" : "Resource not found."
        });

    } catch (error) { return res.status(403).send({ message: error.message }); }

};// End of delete_notification method
