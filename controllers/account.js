const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {promisify} = require('util');
const nodemailer = require('nodemailer');
const i18n = require('i18n');

const session = require('express-session');


// const transporter = nodemailer.createTransport({
//     host: process.env.GMAIL_SERVICE_HOST,
//     account: {
//         user: process.env.GMAIL_USER_NAME,
//         pass: process.env.GMAIL_USER_PASSWORD
//     }
// });
//
// transporter.verify(function(error, success) {
//     if (error) {
//         console.log(error);
//     } else {
//         console.log("Server is ready to take our messages");
//     }
// });

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res.status(400).render('login', {
                message: i18n.__('login_err_1'),
                type: "error"
            })
        }

        db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            console.log(results);
            if (!results || !(await bcrypt.compare(password, results[0].password))) {
                res.status(401).render('login', {
                    message: i18n.__('login_err_2'),
                    type: "error"
                })
            } else {
                const id = results[0].id;

                const token = jwt.sign({id}, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });

                console.log("The token is: " + token);

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                    ),
                    httpOnly: true
                }

                res.cookie('jwt', token, cookieOptions);
                res.status(200).redirect("/");
            }

        })

    } catch (error) {
        console.log(error);
        return res.render('login', {
            message: i18n.__("error"),
            type: "error"
        })
    }
}

exports.validation = (req, res) => {
    const {emailaddress, activationid} = req.params;
    db.query('SELECT token FROM users WHERE token = ?', [activationid], (error, result) => {
        if (result.length == 0) {
            return res.render('index', {
                message: i18n.__('activate_acc_err'),
                type: "error"
            })
        } else {
            db.query('UPDATE users SET token = "1" WHERE email = ?', [emailaddress], (error, result) => {
                console.log(result)
                if (result.length == 0) {
                    return res.render('index', {
                        message: i18n.__('activate_acc_err'),
                        type: "error"
                    })
                } else {
                    return res.render('index', {
                        message: i18n.__('activate_acc_succ'),
                        type: "success"
                    })
                }
            });
        }
    });
}

exports.register = (req, res) => {
    console.log(req.body);

    const {name, email, password, passwordConfirm} = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
            return res.render('register', {
                message: i18n.__("error"),
                type: "error"
            })
        }

        if (results.length > 0) {
            return res.render('register', {
                message: i18n.__('register_err_1'),
                type: "error"
            })
        } else if (password !== passwordConfirm) {
            return res.render('register', {
                message: i18n.__('register_err_2'),
                type: "error"
            });
        }
        let token = new Date().getTime();
        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        db.query('INSERT INTO users SET ?', {
            name: name,
            email: email,
            password: hashedPassword,
            token: token
        }, async (error, results) => {
            if (error) {
                console.log(error);
                return res.render('register', {
                    message: i18n.__("error"),
                    type: "error"
                })
            } else {
                console.log(results);
                if (process.env.MAIL_TYPE === "gmail") {
                    const transporter = nodemailer.createTransport({
                        host: process.env.GMAIL_SERVICE_HOST,
                        auth: {
                            user: process.env.GMAIL_USER_NAME,
                            pass: process.env.GMAIL_USER_PASSWORD
                        }
                    });
                    await transporter.sendMail({
                        from: process.env.GMAIL_USER_NAME,
                        to: email,
                        subject: i18n.__("email_register_subj"),
                        html: '<h3>' + i18n.__("email_register_body_title") + '</h3><p>' + i18n.__("email_register_body_content") + '</p><table border="0" width="390" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">' +
                            '<tbody><tr><td style="border-collapse:collapse;border-radius:3px;text-align:center;display:block;border:solid 1px #009fdf;padding:10px 16px 14px 16px;margin:0 2px 0 auto;min-width:80px;background-color:#47A2EA;">' +
                            '<a rel="nofollow noopener noreferrer" target="_blank" href="' + process.env.HOST_NAME + '/account/' + email + '/activation/' + token + '" style="color:#3b5998;text-decoration:none;display:block;"><center><font size="3"><span style="font-family:Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;white-space:nowrap;font-weight:bold;vertical-align:middle;color:#fdfdfd;font-size:16px;line-height:16px;">' + i18n.__("email_register_conf") + '</span></font></center></a></td></tr></tbody></table>',
                    });
                } else {
                    const transporter = nodemailer.createTransport({
                        host: process.env.GMAIL_SERVICE_HOST,
                        auth: {
                            user: process.env.GMAIL_USER_NAME,
                            pass: process.env.GMAIL_USER_PASSWORD
                        }
                    });
                    await transporter.sendMail({
                        from: process.env.SMTP_USER_NAME,
                        to: email,
                        subject: i18n.__("email_register_subj"),
                        html: '<h3>' + i18n.__("email_register_body_title") + '</h3><p>' + i18n.__("email_register_body_content") + '</p><table border="0" width="390" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">' +
                            '<tbody><tr><td style="border-collapse:collapse;border-radius:3px;text-align:center;display:block;border:solid 1px #009fdf;padding:10px 16px 14px 16px;margin:0 2px 0 auto;min-width:80px;background-color:#47A2EA;">' +
                            '<a rel="nofollow noopener noreferrer" target="_blank" href="' + process.env.HOST_NAME + '/account/' + email + '/activation/' + token + '" style="color:#3b5998;text-decoration:none;display:block;"><center><font size="3"><span style="font-family:Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;white-space:nowrap;font-weight:bold;vertical-align:middle;color:#fdfdfd;font-size:16px;line-height:16px;">' + i18n.__("email_register_conf") + '</span></font></center></a></td></tr></tbody></table>',
                    });
                }

                return res.render('login', {
                    message: i18n.__("register_succ_1"),
                    type: "success"
                })
            }
        });
    });
}


exports.isLoggedIn = async (req, res, next) => {
    // console.log(req.cookies);
    if (req.cookies.jwt) {
        try {
            //1) verify the token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,
                process.env.JWT_SECRET
            );

            console.log(decoded);

            db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (error, result) => {
                console.log(result);

                if (!result) {
                    return next();
                }

                req.user = result[0];
                console.log("user is")
                console.log(req.user);
                return next();

            });
        } catch (error) {
            console.log(error);
            return next();
        }
    } else {
        next();
    }
}


exports.logout = async (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });

    res.status(200).redirect('/');
}

exports.resetpass = (req, res) => {
    const email = req.body.email;
    db.query('SELECT email FROM users WHERE email = ?', [email], (error, results) => {
        if (results.length <= 0) {
            return res.render('forgotpass', {
                message: i18n.__("forgotpass_err"),
                type: "error"
            })
        }
        if (results.length > 0) {
            let variab = new Date().getTime();
            let token = "55" + variab + "55";
            db.query('UPDATE users SET token = ? WHERE email = ?', [token, email], async (error, result) => {
                if (error) {
                    console.log(error);
                    return res.render('forgotpass', {
                        message: i18n.__("error"),
                        type: "error"
                    })
                } else {
                    console.log(result);
                    if (process.env.MAIL_TYPE === "gmail") {
                        const transporter = nodemailer.createTransport({
                            host: process.env.GMAIL_SERVICE_HOST,
                            auth: {
                                user: process.env.GMAIL_USER_NAME,
                                pass: process.env.GMAIL_USER_PASSWORD
                            }
                        });
                        await transporter.sendMail({
                            from: process.env.GMAIL_USER_NAME,
                            to: email,
                            subject: i18n.__("email_reset_pass_subj"),
                            html: '<h3>' + i18n.__("email_reset_body_title") + '</h3><p>' + i18n.__("email_reset_body_content") + '</p><table border="0" width="390" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">' +
                                '<tbody><tr><td style="border-collapse:collapse;border-radius:3px;text-align:center;display:block;border:solid 1px #009fdf;padding:10px 16px 14px 16px;margin:0 2px 0 auto;min-width:80px;background-color:#47A2EA;">' +
                                '<a rel="nofollow noopener noreferrer" target="_blank" href="' + process.env.HOST_NAME + '/password/reset/' + token + '" style="color:#3b5998;text-decoration:none;display:block;"><center><font size="3"><span style="font-family:Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;white-space:nowrap;font-weight:bold;vertical-align:middle;color:#fdfdfd;font-size:16px;line-height:16px;">' + i18n.__("forgotpass_reset") + '</span></font></center></a></td></tr></tbody></table>',
                        });
                    } else {
                        const transporter = nodemailer.createTransport({
                            host: process.env.SMTP_SERVICE_HOST,
                            port: process.env.SMTP_SERVICE_PORT,
                            secure: process.env.SMTP_SERVICE_SECURE,
                            auth: {
                                user: process.env.SMTP_USER_NAME,
                                pass: process.env.SMTP_USER_PASSWORD
                            }
                        });
                        await transporter.sendMail({
                            from: process.env.SMTP_USER_NAME,
                            to: email,
                            subject: i18n.__("email_reset_pass_subj"),
                            html: '<h3>' + i18n.__("email_reset_body_title") + '</h3><p>' + i18n.__("email_reset_body_content") + '</p><table border="0" width="390" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">' +
                                '<tbody><tr><td style="border-collapse:collapse;border-radius:3px;text-align:center;display:block;border:solid 1px #009fdf;padding:10px 16px 14px 16px;margin:0 2px 0 auto;min-width:80px;background-color:#47A2EA;">' +
                                '<a rel="nofollow noopener noreferrer" target="_blank" href="' + process.env.HOST_NAME + '/password/reset/' + token + '" style="color:#3b5998;text-decoration:none;display:block;"><center><font size="3"><span style="font-family:Helvetica Neue, Helvetica, Roboto, Arial, sans-serif;white-space:nowrap;font-weight:bold;vertical-align:middle;color:#fdfdfd;font-size:16px;line-height:16px;">' + i18n.__("forgotpass_reset") + '</span></font></center></a></td></tr></tbody></table>',
                        });
                    }
                    req.session.error = i18n.__("forgotpass_succ");
                    return res.redirect('/success');
                }
            });
        }
    });
    // return res.render('forgotpass', {
    //     message: i18n.__("forgotpass_succ"),
    //     type: "success"
    // })
}


exports.resetpass_valid = (req, res, next) => {
    const token = req.params.token;
    const {password, passwordConfirm} = req.body;

    console.log(token);
    if (password !== passwordConfirm) {
        return res.render('forgotpassvalid', {
            message: i18n.__("register_err_2"),
            type: "error"
        })
    }
    if (password === passwordConfirm) {
        db.query('SELECT token FROM users WHERE token = ?', [token], async (error, results) => {
            if (error) {
                console.log(error);
                return res.render('forgotpass_valid', {
                    message: i18n.__("error"),
                    type: "error"
                })
            }
            if (results.length <= 0) {
                return res.render('forgotpass_valid', {
                    message: i18n.__("forgotpass_err_tk"),
                    type: "error"
                })
            }
            if (results.length > 0) {
                try {
                    console.log(results);
                    let hashedPassword = await bcrypt.hash(password, 8);
                    console.log(hashedPassword);

                    db.query('UPDATE users SET password = ? WHERE token = ?', [hashedPassword, token], async (error, results) => {
                        if (error) {
                            console.log(error);
                            return res.render('forgotpass_valid', {
                                message: i18n.__("register_err_2"),
                                type: "error"
                            })
                        }
                        console.log(results);
                        db.query('UPDATE users SET token = "2" WHERE token = ?', [token], async (error, results) => {
                            if (results.changedRows <= 0) {
                                console.log(error);
                                return res.render('login', {
                                    message: i18n.__("error"),
                                    type: "error"
                                })
                            }
                            if (results.changedRows > 0) {
                                return res.render('login', {
                                    message: i18n.__("forgotpass_done"),
                                    type: "success"
                                })
                            }
                        });
                    });
                } catch (err) {
                    next(err);
                }
            }
        });
    }

}

exports.resetpass_verif = (req, res) => {
    const token = req.params.token;
    db.query('SELECT token FROM users WHERE token = ?', [token], function (error, results) {
        if (results.length <= 0) {
            return res.render('index', {
                lang: req.cookies.locale,
                message: i18n.__("forgotpass_err_tk"),
                type: "error"
            })
        }
        if (results.length > 0) {
            return res.render('forgotpass_valid', {
                lang: req.cookies.locale,
                token: req.params.token
            })
        }
    });
}