let { createDirectories } = require('./checkCreateFolder');

exports.fileUploadPath = (req, next, field, folderLocation) => {

    return new Promise(async (resolve, reject) => {
        let allPath = [];
        let uploadPath = "uploads" + `${folderLocation}/`;//folderLocation = "profile"

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
                try {
                    allPath.push({ "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "") });
                } catch (error) {
                    allPath.push({
                        "path": null
                    });
                    //console.log(error);
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
exports.fileUpload = async (req, next, field, folderLocation) => {

    let allPath = [];
    let uploadPath = "uploads" + `${folderLocation}/`;//folderLocation = "profile"

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
            })
        }
        else {

            var file = req.files[field];

            try {
                allPath.push({ "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "") })
                //var path = (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "")

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
        }
    }
    req.filPath = allPath;
    // req.filPath = path;


}