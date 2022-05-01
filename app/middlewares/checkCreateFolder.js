const fs = require('fs');
const path = require('path');

exports.createDirectories = (pathname) => {
    return new Promise((resolve, reject) => {
        const __dirname = path.resolve();
        pathname = pathname.replace(/^\.*\/|\/?[^\/]+\.[a-z]+|\/$/g, ''); // Remove leading directory markers, and remove ending /file-name.extension
        fs.mkdir(path.resolve(__dirname, pathname), { recursive: true }, e => {
            if (e) {
                console.error(e);
            }

            resolve(true);
        });
    });

}
