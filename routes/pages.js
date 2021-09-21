const express = require('express');
const accountController = require('../controllers/account');
const mysql = require('mysql');
const router = express.Router();
const excel = require('exceljs');

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
router.get('/download/:param', function (req, res) {
    const fname = req.params.param;
    // const file = `${__dirname}/upload-folder/dramaticpenguin.MOV`;
    const file = 'public/download/'+fname + '.xlsx';
    res.download(file); // Set disposition and send it.
});

router.post('/account/info/raport', (req, res) => {
    const {dates, datef} = req.body;
    var strds = dates.split("-");
    var strdf = datef.split("-");
    if (strds[1][0] === "0") {
        strds[1] = strds[1][1];
    }
    if (strdf[1][0] === "0") {
        strdf[1] = strdf[1][1];
    }
    strds = strds[2] + "-" + strds[1] + "-" + strds[0];
    strdf = strdf[2] + "-" + strdf[1] + "-" + strdf[0];
    // let query = "SELECT * FROM info WHERE timestamp > '" + strdf + "' and timestamp <= '" + strds + "'";
    let query = "SELECT * FROM info WHERE timestamp BETWEEN '" + strds + "' and '" + strdf + "'";
    console.log(query);
    // SELECT * FROM info WHERE timestamp BETWEEN  '2021-09-21' and '2021-09-14'
    db.query(query, function (err, customers, fields) {

        const jsonCustomers = JSON.parse(JSON.stringify(customers));
        console.log(jsonCustomers);
        /**
         [ { id: 1, address: 'Jack Smith', age: 23, name: 'Massachusetts' },
         { id: 2, address: 'Adam Johnson', age: 27, name: 'New York' },
         { id: 3, address: 'Katherin Carter', age: 26, name: 'Washington DC' },
         { id: 4, address: 'Jack London', age: 33, name: 'Nevada' },
         { id: 5, address: 'Jason Bourne', age: 36, name: 'California' } ]
         */

        let workbook = new excel.Workbook(); //creating workbook
        let worksheet = workbook.addWorksheet('Customers'); //creating worksheet
        worksheet.columns = [
            {header: 'Data', key: 'timestamp', width: 15},
            {header: 'Nume', key: 'name', width: 30},
            {header: 'Nr. Telefon', key: 'nr', width: 14},
            {header: 'Nr. Inmatriculare', key: 'nrinmatr', width: 30},
            {header: 'Km', key: 'km', width: 10, outlineLevel: 1}
        ];
        worksheet.addRows(jsonCustomers);
        const currentdate = new Date();
        const this_day = currentdate.getDate() + "-"
            + (currentdate.getMonth() + 1) + "-"
            + currentdate.getFullYear();
        workbook.xlsx.writeFile("public/download/" + this_day + ".xlsx")
            .then(function () {
                console.log("file saved!");
                res.redirect('/download/' + this_day);
            });

        // -> Check 'customer.csv' file in root project folder
    });
});
router.post('/account/info/1', (req, res) => {
    const value = req.body;
    if (value.phnr !== undefined) {
        res.redirect('/account/info/1/' + value.phnr);
    }
    if (value.fname !== undefined) {
        res.redirect('/account/info/1/' + value.fname);
    }
    if (value.fdate !== undefined) {
        res.redirect('/account/info/1/' + value.fdate);
    }
    // console.log(phnr.phnr);
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
            console.log("filter" + filterv);
            if (filterv.match(/40.{9}/g)) {
                filter = 'nr = "' + filterv + '" ';
            }
            if (filterv.match(/20[0-9]{2}-.{1,2}-.{1,2}/g)) {
                let str = filterv.split("-");
                if (str[1][0] === "0") {
                    str[1] = str[1][1];
                }
                filter = 'timestamp = "' + str[2] + "-" + str[1] + "-" + str[0] + '" ';
                console.log(filter);
            }
            if (filterv.match(/[^0-9]{4,}/g)) {
                filter = 'name = "' + filterv + '" ';
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
        const perPage = 10, totalCount = result[0].totalCount;
        // Instantiate Pagination class
        const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage, filterv);

        /*Query items*/
        let query = "SELECT * FROM info WHERE " + filter + " LIMIT " + Paginate.perPage + " OFFSET " + Paginate.start + "";
        console.log(query);
        db.query(query, (err, result) => {
            data = {
                path: url,
                items: result,
                pages: Paginate.links()
            }

            // Send data to view
            // console.log(result);
            res.render('info', data);
        });
    });

});


router.get('/test', function (req, res) {
    res.render('info2');
});

router.get('/search/nr', function (req, res) {
    const parm = req.query.key;
    let query = 'SELECT nr from info where nr like "%' + parm + '%"';
    console.log(query);
    db.query(query, function (err, rows, fields) {
        console.log("rows search nr = ");
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

router.get('/search/name', function (req, res) {
    const parm = req.query.key;
    let query = 'SELECT name from info where name like "%' + parm + '%"';
    console.log(query);
    db.query(query, function (err, rows, fields) {
        console.log("rows search name = ");
        console.log(rows)
        if (err) throw err;
        var data = [];
        for (i = 0; i < rows.length; i++) {
            data.push(rows[i].name);
        }
        console.log(data);
        res.end(JSON.stringify(data));
    });
});

module.exports = router;