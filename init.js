const stdin = process.openStdin()
const fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var readline = require('readline-sync');

try{
	let rawconfig = fs.readFileSync('config.json');
}
catch(e){
	let obj = {};
	obj.domain = readline.question("What is your domain? ");
	obj.errjump = readline.question("What is your error jump? ");
	obj.port = readline.question("What is your port? ");
	obj.logging = readline.question("Wanna log usage? (Yes/No) ").toUpperCase() == "NO" ? false : true;
	obj.usehost = readline.question("Wanna use request host? (Yes/No) ").toUpperCase() == "NO" ? false : true;
	obj.googleprefix = encodeURI(readline.question("Keyword for empty google search prefix? ") + " ");
	obj.webjump = readline.question("Wanna use web jump? (Yes/No) ").toUpperCase() == "YES" ? true : false;
	obj.privkey = "/etc/letsencrypt/live/" + obj.domain + "/privkey.pem";
	obj.fullchain = "/etc/letsencrypt/live/" + obj.domain + "/fullchain.pem";
	obj.msky.dbbser = readline.question("Msky DB username? ");
	obj.msky.dbpasswd = readline.question("Msky DB password? ");
	obj.msky.dbhost = readline.question("Msky DB hostname? ");
	obj.msky.dbport = readline.question("Msky DB port? ");
	obj.msky.db = readline.question("Msky DB name? ");
	fs.writeFileSync('config.json', JSON.stringify(obj));
}
finally{
	var db = new sqlite3.Database('url.db');
	db.run("CREATE TABLE url (short TEXT, long TEXT)");
	db.run("CREATE TABLE history (time TEXT, ip TEXT, url TEXT)");
	db.close();
}