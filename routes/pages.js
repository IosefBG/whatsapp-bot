const express = require('express');
const accountController = require('../controllers/account');
const mysql = require('mysql');
const router = express.Router();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


router.get('/', accountController.isLoggedIn, (req, res) => {
    console.log(req.user);
    if (req.user) {
        res.redirect('/account/dashboard');
    } else {
        res.render('login');
    }
})

router.post('/account/register', accountController.register);

router.post('/account/login', accountController.login);

// router.post('/account/password/reset', accountController.resetpass);
//
// router.post('/account/password/reset/:token', accountController.resetpass_valid);

router.get('/account/logout', accountController.logout);

router.get('/account/password/reset', (req, res) => {
    res.render('forgotpass');
});

router.get('/account/dashboard', accountController.isLoggedIn, (req, res) => {
    console.log(req.user);
    if (req.user) {
        let verify = "SELECT value FROM config WHERE name = 'bot_status'";
        db.query(verify, (err, result) => {
            let valoare;
            if (err) console.log(err);
            if (result[0].value === 0) {
                valoare = undefined;
            }
            if (result[0].value === 1) {
                valoare = "1";
            }
            console.log(result[0].value);
            res.render('PCndashboard', {
                user: req.user,
                path: req.originalUrl,
                status: valoare
            });
        });
    } else {
        res.redirect('/');
    }


})
// router.get('/account/info', (req, res) => {
//    res.redirect('/account/info/1');
// });
router.post('/account/info/1', (req,res) => {
    const phnr = req.body;
    // console.log(phnr.phnr);
    res.redirect('/account/info/1/'+phnr.phnr);
})

router.get('/account/info/:page?/:filter?', (req, res) => {
    // if (phnr !== undefined) {
    //     console.log(phnr);
    //     if (phnr.match(/40.{9}/g)) {
    //         console.log("phnr= " + phnr);
    //     }
    // }
    Pagination = require('../controllers/pagination');
    const urls = req.originalUrl.split('/');
    const url = urls[urls.length - 1];
    const param = req.params.page;
    const filterv = req.params.filter;
    var filter = "";

    if (param !== undefined) {
        page_id = param;
        if (filterv !== undefined) {
            if (filterv.match(/40.{9}/g)) {
                filter = 'nr = "' + filterv + '" ';
            }
            if (filterv.match(/.{2}-.{1,2}-.{4}/g)) {
                filter = 'timestamp = "' + filterv + '" ';
            }
        } else {
            filter = "nr IS NOT NULL";
        }
    } else {
        res.redirect('/account/info/1');
    }
    currentPage = page_id > 0 ? page_id : currentPage, pageUri = '/account/info/';


    let query = 'SELECT COUNT(id) as totalCount FROM info WHERE ' + filter;
    console.log(filter);
    console.log(query);
    db.query(query, (err, result) => {
        db.query('SELECT nr FROM info GROUP BY nr', (err, uniqnr) => {
            db.query('SELECT timestamp FROM info GROUP BY timestamp', (err, uniqtms) => {
                console.log(uniqtms);
                console.log(uniqnr);
                const perPage = 10, totalCount = result[0].totalCount;
                // Instantiate Pagination class
                const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage, filterv);

                /*Query items*/
                let query = "SELECT * FROM info WHERE " + filter + " LIMIT " + Paginate.perPage + " OFFSET " + Paginate.start + "";
                console.log(query);
                db.query(query, (err, result) => {
                    data = {
                        path: url,
                        uniqtms: uniqtms,
                        uniqnr: uniqnr,
                        items: result,
                        pages: Paginate.links()
                    }

                    // Send data to view
                    // console.log(result);
                    res.render('info', data);
                });
            });
        });
    });

});


router.get('/test', function (req, res) {
    res.render('info2');
});

router.get('/search', function (req, res) {
    db.query('SELECT nr from info where nr like "%' + req.query.key + '%"', function (err, rows, fields) {
        console.log(rows)
        if (err) throw err;
        var data = [];
        for (i = 0; i < rows.length; i++) {
            data.push(rows[i].nr);
        }
        console.log(data);
        res.end(JSON.stringify(data));
    });
});

module.exports = router;