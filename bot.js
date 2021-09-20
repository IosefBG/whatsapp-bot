const mysql = require('mysql');
const dotenv = require('dotenv');
const venom = require('venom-bot');
const fs = require('fs');
const mime = require('mime-types');

dotenv.config({path: './.env'});

const con = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

venom
    .create(
        'sessionName',
        (base64Qr, asciiQR, attempts, urlCode) => {
            console.log(asciiQR); // Optional to log the QR in the terminal
            const matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
                response = {};

            if (matches.length !== 3) {
                return new Error('Invalid input string');
            }
            response.type = matches[1];
            response.data = new Buffer.from(matches[2], 'base64');

            const imageBuffer = response;
            require('fs').writeFile(
                'public/img/qr.png',
                imageBuffer['data'],
                'binary',
                function (err) {
                    if (err != null) {
                        console.log(err);
                    }
                }
            );
        },
        (statusSession, session) => {
            console.log('Status Session: ', statusSession);
            //connected: isLogged || qrReadSuccess || chatsAvailable;
            //disconnected: notLogged || browserClose || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken || deviceNotConnected || serverWssNotConnected || noOpenBrowser
            if (statusSession == "isLogged" || statusSession == "qrReadSuccess" || statusSession == "chatsAvailable") {
                let verify = "UPDATE config SET value = '1' WHERE name = 'bot_status'";
                con.query(verify, (err, res) => {
                    if (err) console.log(err);
                    console.log('Data inserted into Db:');
                    console.log(res);
                });
            } else {
                let verify = "UPDATE config SET value = '0' WHERE name = 'bot_status'";
                con.query(verify, (err, res) => {
                    if (err) console.log(err);
                    console.log('Data inserted into Db:');
                    console.log(res);
                });
            }
            let verify = "SELECT value FROM config WHERE name = 'bot_restart'";
            con.query(verify, (err, res) => {
                if (res[0].value == 1) {
                    return process.exit();
                }
            });

            //Create session wss return "serverClose" case server for close
            console.log('Session name: ', session);
        },
        {logQR: true, autoClose: 0, catchQR: 1}
    )

    .then((client) => {

        // let time = 0;
        // client.onStreamChange((state) => {
        //     console.log('State Connection Stream: ' + state);
        //     clearTimeout(time);
        //     if (state === 'DISCONNECTED' || state === 'SYNCING') {
        //         time = setTimeout(() => {
        //             client.close();
        //         }, 80000);
        //     }
        // })

        client.onStreamChange((state) => {
            console.log('State Connection Stream: ' + state);
            if (state === 'DISCONNECTED') {
                return process.exit();
            }
        });

        client.onMessage((message) => {
            // const msj = message.body.substring(0, 2);
            // const regex_scuter = /nume:.{4,},\snr inmatriculare:.+-,\skm:.+/g;
            // const regex_car = /nume:.{4,},\snr inmatriculare:.{5,},\skm:.+/g;
            const regex = /nume:.{4,},\snr inmatriculare:.+-.{4,},\skm:.+/g;
            console.log(message.body);
            // if (message.body.match(regex) && message.isGroupMsg === false) {
            if (message.body.match(regex) && message.isGroupMsg === false) {
                // console.log(message.body);
                // const str = message.body;
                // if (str.match(regex)) {
                //     console.log(str.match(regex))
                //     console.log("hit");
                // } else {
                //     console.log("passed")
                // }
                client
                    .sendText(message.from, 'Informatiile se proceseaza')
                    .then((result) => {
                        const phone = result['to']['remote']['user'];
                        const currentdate = new Date();
                        const this_day = currentdate.getDate() + "-"
                            + (currentdate.getMonth() + 1) + "-"
                            + currentdate.getFullYear();
                        let verify = 'SELECT * FROM info WHERE timestamp = "' + this_day + '" AND nr = "' + phone + '"';
                        con.query(verify, (err, result) => {
                            if (err) console.log(err);
                            if (result[0] != undefined || result[0]) {
                                if (result[0].msj.length > 1) {
                                    console.log(phone + " a introdus deja informatii pe data " + this_day);
                                    client.sendText(message.from, 'Ai trimis deja informatii azi.')
                                }
                                if (result[0].msj.length < 1) {
                                    const words = message.body.split(/nume: |, nr inmatriculare: |, km: /g);
                                    let verify = 'UPDATE info SET msj = "' + message.body + '", name = "' + words[1] + '", nrinmatr = "' + words[2] + '", km = "' + words[3] + '", WHERE timestamp = "' + this_day + '" AND nr = "' + phone + '"';
                                    con.query(verify, (err, res) => {
                                        if (err) console.log(err);
                                        console.log('Data inserted into Db:');
                                        console.log(res);
                                    });
                                }
                            } else {
                                const words = message.body.split(/nume: |, nr inmatriculare: |, km: /g);
                                let verify = "INSERT INTO info (timestamp,msj,name,nrinmatr,km,nr) VALUES ('" + this_day + "','" + message.body + "','" + words[1] + "','" + words[2] + "','" + words[3] + "','" + phone + "')";
                                con.query(verify, (err, res) => {
                                    if (err) console.log(err);
                                    console.log('Data inserted into Db:');
                                    console.log(res);
                                    client.sendText(message.from, 'Informatiile au fost introduse cu succes')
                                });
                            }
                        });
                        console.log('Result: ', result); //return object success
                    })
                    .catch((erro) => {
                        console.error('Error when sending: ', erro); //return object error
                    });
            }
            if ((message.isMedia === true || message.isMMS === true) && message.isGroupMsg === false) {
                client
                    .sendText(message.from, 'Poza a fost receptionata')
                    .then(async (result) => {
                        const phone = result['to']['remote']['user'];
                        const currentdate = new Date();
                        const this_day = currentdate.getDate() + "-"
                            + (currentdate.getMonth() + 1) + "-"
                            + currentdate.getFullYear();
                        const img_name = this_day + "@" + phone;
                        let verify = 'SELECT * FROM info WHERE timestamp = "' + this_day + '" AND nr = "' + phone + '"';
                        console.log("verify_img= " + verify);
                        con.query(verify, async (err, result) => {
                            if (err) throw err;
                            console.log('Data received from Db: ');
                            console.log(result);
                            if (result[0] != undefined || result[0]) {
                                if (result[0].img.length > 1) {
                                    client.sendText(message.from, 'Ai trimis poza deja azi.')
                                    console.log(phone + " a introdus deja poza pe data " + this_day);
                                }
                                if (result[0].img.length < 1 || result[0].img == undefined) {
                                    const buffer = await client.decryptFile(message);
                                    const fileName = `public/img/km/${img_name}.${mime.extension(message.mimetype)}`;
                                    await fs.writeFile(fileName, buffer, (err) => {
                                        let verify = 'UPDATE info SET img = "' + img_name + '" WHERE timestamp = "' + this_day + '" AND nr = "' + phone + '"';
                                        con.query(verify, (err, res) => {
                                            console.log('Data received from Db: ' + res);
                                        });
                                    });
                                }
                            } else {
                                const buffer = await client.decryptFile(message);
                                const fileName = `public/img/km/${img_name}.${mime.extension(message.mimetype)}`;
                                await fs.writeFile(fileName, buffer, (err) => {
                                    let verify = "INSERT INTO info (timestamp,img,nr) VALUES ('" + this_day + "','" + img_name + "','" + phone + "')";
                                    con.query(verify, (err, res) => {
                                        console.log('Data received from Db: ');
                                        console.log(res);
                                    });
                                });
                            }
                        });
                        console.log('Result: ', result); //return object success
                    })
                    .catch((erro) => {
                        console.error('Error when sending: ', erro); //return object error
                    });
            }
            if (message.body === "!km" && message.isGroupMsg === false && (message.isMedia === false || message.isMMS === false)) {
                client.sendText(message.from, "Pentru a inregistra km ai urmatorul model:\nnume: [nume], nr inmatriculare: [nr], km: [km]\nex:")
                client.sendText(message.from, "nume: " + message["sender"]["name"] + ", nr inmatriculare: B-12345, km: 25000")
            }
            if (message.body === "!check" && message.isGroupMsg === false && (message.isMedia === false || message.isMMS === false)) {
                client
                    .sendText(message.from, 'Informatiile se proceseaza')
                    .then((result) => {
                        const phone = result['to']['remote']['user'];
                        const lastdate = new Date(+new Date - 12096e5);
                        const last_date = lastdate.getDate() + "-"
                            + (lastdate.getMonth() + 1) + "-"
                            + lastdate.getFullYear();
                        let query = "SELECT * FROM info WHERE timestamp >= " + last_date + " and nr = " + phone;
                        console.log(query);
                        var value = "";
                        con.query(query, async (err, res) => {
                            res.forEach(function (row) {
                                value = value + 'data: ' + row.timestamp + 'km: ' + row.km + '\n';
                            });
                            client.sendText(message.from, value);
                        });
                    })
            }

        });
    })
    .catch((erro) => {
        console.log(erro);
    });