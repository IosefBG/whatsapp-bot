module.exports = {
    apps : [{
        name   : "website",
        script : "./app.js",
        out_file : "./logs/web.txt"
    },{
        name   : "bot",
        script : "./bot.js",
        out_file : "./logs/bot.txt"
    }]
}