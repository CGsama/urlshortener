var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('url.db');
db.run("CREATE TABLE url (short TEXT, long TEXT)");
db.close();
