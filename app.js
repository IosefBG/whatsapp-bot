const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const i18n = require('i18n');
const exphbs = require('express-hbs');
const session = require('express-session');

dotenv.config({path: './.env'});

const app = express();

const con = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});


const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended: false}));
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser())

app.engine('.hbs', exphbs.express4({
    extname: '.hbs',
    partialsDir: __dirname + '/views/partials',
    defaultLayout: false,
    helpers: {
        __: function () {
            return i18n.__.apply(this, arguments);
        },
        __n: function () {
            return i18n.__n.apply(this, arguments);
        }
    }
}));
app.set('view engine', '.hbs')


i18n.configure({
    locales: ['ro', 'en'],
    // fallbacks: {'ro': 'en'},
    defaultLocale: 'ro',
    cookie: 'locale',
    queryParameter: 'lang',
    directory: __dirname + '/locales',
    directoryPermissions: '755',
    autoReload: true,
    updateFiles: true,
    api: {
        '__': '__',  //now req.__ becomes req.__
        '__n': '__n' //and req.__n can be called as req.__n
    }
});
app.use(i18n.init);
app.use((req, res, next) => {
    if (req.cookies.locale === undefined) {
        res.cookie('locale', 'ro', {maxAge: 900000, httpOnly: true});
        // req.setLocale('ro');
    }
    next();
});

exphbs.registerHelper('hrefcheck', function(url, value, nr){
    this.url = url;
    this.value = value;
    this.nr = nr;
    if(this.url === this.value + this.nr){
        return "selected";
    }
});

con.connect((error) => {
    if (error) {
        console.log(error)
    } else {
        console.log("MYSQL Connected...")
    }
})


//Define Routes
app.use(
    session({
        resave: false,
        saveUninitialized: true,
        secret: process.env.SESSION_SECRET,
    })
);


app.use('/', require('./routes/pages'));

app.listen(80, () => {
    console.log("Server started on Port 80");
})

// BOT STUFF
