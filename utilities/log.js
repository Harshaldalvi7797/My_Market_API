const fs = require('fs');

exports.writeLog = (input, output) => {
    let date = new Date();
    const fileName = "Log/" + date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear() + "_log.txt";

    //console.log(input.headers, input.payload);
    if (input.headers && input.payload) {
        input = { headers: input.headers, payload: input.payload }
    } else if (input.headers && input.params && input.query) {
        input = { headers: input.headers, params: input.params, query: input.query }
    } else if (typeof input != 'string' && input.headers) {
        input = { headers: input.headers, req: 'unable to log request' }
    }
    let logTime = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

    let logMessage = JSON.stringify({ logTime: logTime, input: input, output: output });
    fs.appendFile(fileName, logMessage + "\n", function (err) {
        if (err) throw err;
        // console.log('Log Saved!');
    });
}
