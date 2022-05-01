exports.setDateTime = (stringdate) => {
    let date = new Date(stringdate.toString());
    // console.log(date);
    let year = date.getFullYear();
    let mnth = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hr = ("0" + date.getHours()).slice(-2);
    let min = ("0" + date.getMinutes()).slice(-2);
    let sec = ("0" + date.getSeconds()).slice(-2);

    // console.log(`${year}-${mnth}-${day} ${hr}:${min}:${sec}`)
    return Number(`${year}${mnth}${day}${hr}${min}${sec}`)
}