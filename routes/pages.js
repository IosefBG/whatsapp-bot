const express = require('express');
const accountController = require('../controllers/account');
const i18n = require('i18n');
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
    if( req.user ) {
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
            var valoare;
            if (err) console.log(err);
            if (result[0].value == 0){valoare = undefined;}
            if (result[0].value == 1){valoare = "1";}
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

router.get('/account/info/:page',(req,res) => {
    Pagination = require('../controllers/pagination'),

        // Get current page from url (request parameter)
        page_id = parseInt(req.params.page),
        currentPage = page_id > 0 ? page_id : currentPage,

//Change pageUri to your page url without the 'page' query string
        pageUri = '/account/info/';

    /*Get total items*/
    const selwhere = req.body.nrtelunq;
    // let query = 'SELECT COUNT(id) as totalCount FROM info WHERE nr <= IF(? IS NOT NULL, ?, '+selwhere+')';
    let query_b = 'SELECT COUNT(id) as totalCount FROM info';
    // console.log(query);
    db.query(query_b,(err,result)=>{
        db.query('SELECT nr FROM info GROUP BY nr', (err,uniqnr)=>{
            // Display 10 items per page

            console.log(uniqnr);
            const perPage = 10,
                totalCount = result[0].totalCount;

            // Instantiate Pagination class
            const Paginate = new Pagination(totalCount,currentPage,pageUri,perPage);

            /*Query items*/
            let query = "SELECT * FROM info LIMIT "+Paginate.perPage+" OFFSET "+Paginate.start+"";
            console.log(query);
            db.query(query,(err,result)=>{
                data = {
                    uniqnr: uniqnr,
                    items : result,
                    pages : Paginate.links()
                }

                // Send data to view
                // console.log(result);
                res.render('info',data);
            });
        });
    });

});

// router.post('/account/info', (req,res) => {
//
// })
module.exports = router;