let { createDirectories } = require('./checkCreateFolder');
const { v4: uuidv4 } = require('uuid');

exports.fileUpload = async (req, next, field, folderLocation) => {

    const { files } = req;

    try {
        // If user id is not available then going to throw error.
        if (!req.userId)
            throw Error("user Id is not available");


        const allPath = [];
        const uploadPath = "uploads/" + req.userId + `/${folderLocation}/`;//folderLocation = "profile"
        // let photoOrder = (req.body.photoOrder);
        let photoOrder = JSON.parse(req.body.photoOrder);

        photoOrder = photoOrder.filter(a => a != null);

        if (req.body.productVariantImages) {
            photoOrder.splice(0, 1);
        }

        // Throwing error if files is not available
        if (!files || !files[field]) throw Error("File is not available");

        // Creeating directories
        await createDirectories(uploadPath);

        if (files[field].length) {
            files[field].forEach((file, i) => {
                try {
                    allPath.push({
                        "active": true,
                        "photoOrder": photoOrder[i],
                        "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""),
                        "image_id": uuidv4()
                    });
                } catch (error) {
                    allPath.push({
                        "active": false,
                        "photoOrder": null,
                        "path": null
                    });
                    //console.log(error);
                }

                file.mv(uploadPath + file.name, function (err) {
                    if (err) { console.log(err); }
                    else {
                        console.log('file uploaded successfully');
                    }
                });
            });

        } else {
            const file = files[field];
            photoOrder = photoOrder.filter(a => {
                return a != null;
            });

            try {
                allPath.push({
                    "active": true,
                    "photoOrder": photoOrder[0],
                    "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""),
                    image_id: uuidv4()
                });

            } catch (error) {
                allPath.push({
                    "active": false,
                    "path": null
                });
            }

            file.mv(uploadPath + file.name, function (err) {
                if (err) { console.log(err); }
                else {
                    console.log('file uploaded successfully');
                }
            });

        }// End of if-else

        req.filPath = allPath;

        return allPath;

    } catch (error) {
        console.log(error);
        throw error;
    }

}

// End of fileUpload

exports.fileUploadAd = async (req, next, field, folderLocation) => {

    const { files } = req;

    try {
        // If user id is not available then going to throw error.
        if (!req.userId)
            throw Error("user Id is not available");


        const allPath = [];
        const uploadPath = "uploads/" + req.userId + `/${folderLocation}/`;//folderLocation = "profile"
        // let photoOrder = (req.body.photoOrder);
        let language = JSON.parse(req.body.language);

        language = language.filter(a => a != null);

        if (req.body.language) {
            language.splice(0, 1);
        }

        // Throwing error if files is not available
        if (!files || !files[field]) throw Error("File is not available");

        // Creeating directories
        await createDirectories(uploadPath);

        if (files[field].length) {
            files[field].forEach((file, i) => {
                try {
                    allPath.push({
                        "active": true,
                        "language": language[i],
                        "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""),
                        "image_id": uuidv4()
                    });
                } catch (error) {
                    allPath.push({
                        "active": false,
                        "language": null,
                        "path": null
                    });
                    //console.log(error);
                }

                file.mv(uploadPath + file.name, function (err) {
                    if (err) { console.log(err); }
                    else {
                        console.log('file uploaded successfully');
                    }
                });
            });

        } else {
            const file = files[field];
            language = language.filter(a => {
                return a != null;
            });

            try {
                allPath.push({
                    "active": true,
                    "language": photoOrder[0],
                    "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""),
                    image_id: uuidv4()
                });

            } catch (error) {
                allPath.push({
                    "active": false,
                    "path": null
                });
            }

            file.mv(uploadPath + file.name, function (err) {
                if (err) { console.log(err); }
                else {
                    console.log('file uploaded successfully');
                }
            });

        }// End of if-else

        req.filPath = allPath;

        return allPath;

    } catch (error) {
        console.log(error);
        throw error;
    }

}


exports.sellerFileUpload = async (req, field, folderLocation, format = null) => {
    return new Promise(async (resolve, reject) => {
        let allPath = [];
        const uploadPath = "uploads/" + req.userId + `/${folderLocation}/`;//folderLocation = "profile"

        if (req.files && req.files[field]) {
            await createDirectories(uploadPath);

            if (req.files[field].length) {
                req.files[field].forEach((ele, i) => {
                    var file = ele
                    try {
                        allPath.push({
                            "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "")

                        });
                    } catch (error) {
                        allPath.push({
                            "path": null
                        });
                        //console.log(error);
                    }

                    file.mv(uploadPath + file.name, function (err) {
                        if (err) { console.log(err); }
                        else {
                            console.log('file uploaded successfully');
                        }
                    });

                    if (i == (req.files[field].length - 1)) {
                        req.filPath = allPath;
                        resolve(allPath);
                    }
                })
            }
            else {
                var file = req.files[field];
                // console.log(file.name)
                if (format == null) {
                    try {
                        allPath.push((req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""));
                    } catch (error) {
                        allPath.push({
                            "path": null
                        });
                        //console.log(error);
                    }
                } else if (file.name.toString().split(".")[file.name.toString().split(".").length - 1].toLowerCase() == format) {
                    try {
                        allPath.push((req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, ""));
                    } catch (error) {
                        allPath.push({
                            "path": null
                        });
                        //console.log(error);
                    }
                } else {
                    resolve(false)
                }

                file.mv(uploadPath + file.name, function (err) {
                    if (err) { console.log(err); }
                    else {
                        req.filPath = allPath;
                        resolve(allPath);
                        console.log('file uploaded successfully');
                    }
                });
            }
        }
    });

}