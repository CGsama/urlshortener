var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('url.db');
db.each("SELECT rowid AS id, short, long FROM url", function(err, row) {
  console.log(row.id + ":" + row.short + ":" + row.long);
});
db.close()
