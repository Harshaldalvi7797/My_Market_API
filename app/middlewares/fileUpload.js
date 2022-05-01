let { createDirectories } = require('./checkCreateFolder');

exports.fileUpload = async (req, next, field, folderLocation) => {
    if (req.userId) {
        let allPath = [];
        let uploadPath = "uploads/" + req.userId + `/${folderLocation}/`;//folderLocation = "profile"
        let photoOrder = JSON.parse(req.body.photoOrder);

        try {

            photoOrder = photoOrder.filter(a => {
                //console.log(a);
                return a != null;
            });


            if (req.body.productVariantImages) {
                photoOrder.splice(0, 1);
            }

            if (req.files && req.files[field]) {
                await createDirectories(uploadPath);

                if (req.files[field].length) {
                    req.files[field].forEach((ele, i) => {
                        var file = ele
                        try {
                            allPath.push({
                                "active": true,
                                "photoOrder": photoOrder[i],
                                "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "")
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
                    })
                } else {
                    var file = req.files[field];
                    photoOrder = photoOrder.filter(a => {
                        //console.log(a);
                        return a != null;
                    });
                    try {
                        allPath.push({
                            "active": true,
                            "photoOrder": photoOrder[0],
                            "path": (req.headers.host + "/" + uploadPath + file.name).replace(/uploads\//g, "")
                        });
                    } catch (error) {
                        allPath.push({
                            "active": false,
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
        } catch (error) {

        }

    }
}