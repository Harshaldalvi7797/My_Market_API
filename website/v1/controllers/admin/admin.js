const { validationResult } = require("express-validator");
const ALL_MODELS = require("../../../../utilities/allModels");
let bcrypt = require("bcrypt");
let mongoose = require("mongoose");
let { sendNotification } = require("../../middlewares/sendNotification");

exports.adminStatus = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
            return res.send({ message: "There was no admin found with given information!" })
        }
        let admin = await ALL_MODELS.admin.findOne({ "_id": req.body.id })
        if (!admin)
            return res.status(404).send({
                message: "There was no admin found with given information!",
            });
        admin.active = req.body.active
        admin.save()
        return res.send({ message: "Admin status has been updated." });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.adminWithSearch = async function (req, res) {
    let { search } = req.body;
    let { limit, page } = req.body;

    if (!limit) { limit = 10; }
    if (!page) { page = 1; }

    let perPage = parseInt(limit);
    let pageNo = Math.max(0, parseInt(page));

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }
    let filter = {};
    if (search) {
        const regexp = new RegExp(search, "i");
        filter["$or"] = [
            { "fullName": regexp },
            { "emailAddress": regexp },
            { "role.name": regexp },
            { "mobileNumber": regexp },
        ];
        if (parseInt(search) != NaN) {
            filter["$or"].push({ "indexNo": parseInt(search) });
        }

    }
    let admin = await ALL_MODELS.admin.aggregate([
        {
            $lookup: {
                from: "roles",
                localField: "role",
                foreignField: "_id",
                as: "role",
            }
        },
        {
            $unwind: {
                "path": "$role",
                "preserveNullAndEmptyArrays": true
            }
        },
        { $addFields: { "fullName": { $concat: ["$firstName", " ", "$lastName"] } } },
        { $match: filter },
        { $sort: { "indexNo": -1 } },
        {
            $project: {
                "password": 0,
                "role.permissions": 0,
                "resetpasswordtoken": 0,
                "resetpasswordexpire": 0
            }
        },

        {
            $facet: {
                paginatedResults: [
                    {
                        $skip: (perPage * pageNo),
                    },
                    {
                        $limit: perPage,
                    },
                ],
                totalCount: [
                    {
                        $count: "count",
                    },
                ],
            },
        },
    ]);
    const adminList = admin.length ? admin[0].paginatedResults : [];

    let totalCount = 0;
    try {
        totalCount = admin[0].totalCount[0].count;
    } catch (err) { }
    return res.send({ totalCount: totalCount, count: adminList.length, data: adminList });
}

exports.addAdmin = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }
    let admin = await ALL_MODELS.admin.findOne({
        "emailAddress": req.body.emailAddress
    });
    if (admin) {
        return res.status(409).send({ message: "Uh Oh! This Email Address is in use. Try logging in instead." });
    }
    let mobile = await ALL_MODELS.admin.findOne({
        "mobileNumber": req.body.mobileNumber
    });

    // console.log(mobile)
    if (mobile) {
        return res.status(409).send({ message: "Uh Oh! This Mobile Number is in use. Try logging in instead" });
    }

    const newadmin = new ALL_MODELS.admin({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        mobileNumber: req.body.mobileNumber,
        mobileCountryCode: req.body.mobileCountryCode,
        emailAddress: req.body.emailAddress,
        password: req.body.password
    });
    let salt = await bcrypt.genSalt(10);
    // @ts-ignore
    newadmin.password = await bcrypt.hash(
        // @ts-ignore
        newadmin.password,
        salt
    );
    // let otp = generateOTP();
    // newadmin.otp = otp;
    // newadmin.expireOtp = Date.now() + (1000 * 60) * 5; // 5 min expiry time added
    let data = await newadmin.save();
    // let mailBody = {
    //     'emailId': req.body.emailAddress,
    //     'subject': 'Registration',
    //     'message': `Congratulations! Your account has been created. Your one time password is ` + otp + `.`
    // }
    // req.mailBody = mailBody;
    // await mailService.sendMail(req, res);
    // admin = await allModels.admin.findOne({
    //     emailAddress: req.body.emailAddress
    // })

    return res.send({
        message: "Congratulations! Your account has been created.",
        d: data, token: newadmin.adminToken()
    });

}

exports.getSingleAdmin = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.send({ message: "There was no admin found with given information!" })
        }
        let admin = await ALL_MODELS.admin.findById(req.params.id)
            .populate({
                path: "role", select: ["name", "permissions"],
                populate: {
                    path: "permissions"
                }
            })
        if (!admin) {
            return res.status(404).send({
                message: "There was no admin found with given information!",
            });
        }
        return res.send({ admin });
    } catch (error) {
        return res.status(403).send({ message: error.message })
    }

}

exports.deleteAdmin = async (req, res) => {
    try {
        const { _id } = req.params;
        const { n: isDeleted } = await ALL_MODELS.admin.deleteOne({ _id });

        return res.status(isDeleted ? 200 : 404).json({
            message: isDeleted ? "Admin deleted successfully" : "Resource not found."
        });

    } catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.updateAdmin = async (req, res, next) => {
    try {
        const adminId = req.params.id
        let admin = await ALL_MODELS.admin.findOne({ _id: adminId })

        if (!admin) {
            return res.status(404).send({ message: "No admin found in this given Information" })
        }
        const updateKeys = Object.keys(req.body)
        updateKeys.forEach((update) => (
            admin[update] = req.body[update]
        ))
        if (updateKeys.includes('password')) {
            let salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(admin.password, salt)
        }
        await admin.save();

        if (req.body.role) {
            let rolename = await ALL_MODELS.role.findOne({ "_id": admin.role }).select(['name']);
            admin.adminname = admin.firstName
            admin.rolename = rolename.name
            admin.emailId = admin.emailAddress
            sendNotification(req, req.userId, adminId, '47', admin, "admin", admin._id)
        }
        return res.status(201).send({ message: "Admin updated successfully", admin })
    }
    catch (err) {
        return res.status(403).send({ message: err.message });
    }



}

//Get and Set roles and permissions
exports.getPermissions = async (req, res) => {
    try {
        let { limit, page, search } = req.query;

        if (!limit) { limit = 10 }
        if (!page) { page = 1 }

        let perPage = parseInt(limit)
        let pageNo = Math.max(0, parseInt(page))

        if (pageNo > 0) {
            pageNo = pageNo - 1;
        } else if (pageNo < 0) {
            pageNo = 0;
        }

        let filter = {};
        if (search) {
            let regexp = new RegExp(search, "i");
            filter['$or'] = [];

            filter['$or'].push({ ['name']: regexp });
            filter['$or'].push({ ['code']: regexp });

            // filter['$or'].push({ ['_id']: regexp });
            if (!isNaN(parseInt(search))) {
                filter['$or'].push({ ['indexNo']: parseInt(search) });
            }
        }

        //console.log(filter)

        let permissions = await ALL_MODELS.permissions.find(filter)
            .skip((perPage * pageNo))
            .limit(perPage);

        let totalCount = await ALL_MODELS.permissions.find(filter).count();

        return res.send({ totalCount: totalCount, count: permissions.length, data: permissions });

    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.addRole = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    let { name, permissions } = req.body;
    let getRole = await ALL_MODELS.role.findOne({ name: name })
    if (getRole) {
        return res.status(403).send({ message: "Role with same name already exist" });
    }
    if (typeof permissions != 'object') {
        // return res.status(403).send({ message: "Please enter valid permissions with valid format" });
        permissions = []
    }

    try {
        let role = new ALL_MODELS.role({
            name: name,
            permissions: permissions
        })

        await role.save();
        return res.send({ message: "Role added successfully", data: role });
    } catch (error) {
        return res.status(403).send({ message: "Please enter unique permissions", error: error.message });
    }
}

exports.getRole = async (req, res) => {
    let { status, limit, page, search } = req.query;

    if (!limit) { limit = 10 }
    if (!page) { page = 1 }

    let perPage = parseInt(limit)
    let pageNo = Math.max(0, parseInt(page))

    if (pageNo > 0) {
        pageNo = pageNo - 1;
    } else if (pageNo < 0) {
        pageNo = 0;
    }

    let filter = {};
    if (status) {
        filter = { status: status };
    }
    if (search) {
        const regexp = new RegExp(search, "i");
        filter['$or'] = [];
        filter['$or'].push({ ['name']: regexp });

        if (!isNaN(parseInt(search))) {
            filter['$or'].push({ ['indexNo']: parseInt(search) });
        }
    }

    let role = await ALL_MODELS.role.find(filter)
        .populate({ path: "permissions" })
        .skip((perPage * pageNo))
        .limit(perPage);

    let totalCount = await ALL_MODELS.role.find(filter).count();

    return res.send({ totalCount: totalCount, count: role.length, data: role });
}

exports.getRoleDetails = async (req, res) => {
    try {
        let id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(403).send({ message: "Invalid role id" });
        }

        let role = await ALL_MODELS.role.findOne({ _id: id })
            .populate({ path: "permissions" });
        if (!role) {
            return res.status(403).send({ message: "No role found" });
        }
        return res.send({ data: role });
    }
    catch (error) {
        return res.status(403).send({ message: error.message });
    }
}

exports.deleteRole = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(403).send({ message: "Invalid role id" });
    }
    let role = await ALL_MODELS.role.findOne({ _id: id });
    if (!role) {
        return res.status(403).send({ message: "Invalid role" });
    }
    await ALL_MODELS.role.deleteOne({ _id: id });

    return res.send({ message: "Role deleted successfully" });
}

exports.editRole = async (req, res) => {
    const validationError = validationResult(req);
    if (!validationError.isEmpty()) {
        return res.status(403).send({ message: validationError.array() });
    }

    const { id, name, permissions, status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(403).send({ message: "Invalid role id" });
    }
    let role = await ALL_MODELS.role.findOne({ _id: id });
    if (!role) {
        return res.status(403).send({ message: "Invalid role" });
    }
    if (name) { role.name = name }
    if (permissions) { role.permissions = permissions }
    if (status != undefined) { role.status = status }

    let data = await role.save();

    return res.send({ message: "Role updated successfully", data: data });
}