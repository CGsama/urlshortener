var http = require('http');
var url = require('url');
var sqlite3 = require('sqlite3').verbose();
//var db = new sqlite3.Database(':memory:');
var db = new sqlite3.Database('url.db');
var crypto = require('crypto');
var hash = crypto.createHash('sha256');

//process.stdin.resume();

db.serialize(function() {
        var server = http.createServer(function(req, res){
                if(url.parse(req.url).pathname == '/shortener'){
                        if(url.parse(req.url).query != null){
                                let target = url.parse(req.url,true).query.url;
                                if(target != null){
                                        shortener(res, target)
                                }
                        }
                }else{
                        orig_url(url.parse(req.url).pathname, res);
                }
        });
        server.listen(54333);
});

/*process.on('SIGINT', function () {
  console.log('Close db & exit');
  db.close();
});*/


function shortener(res, url){
        //var db = new sqlite3.Database('url.db');
        //db.run("CREATE TABLE url (short TEXT, long TEXT)");
        let key = crypto.createHash('sha256').update("" + url).digest('base64').replace(/\W/g, "").substring(0,6);

        let empty = true;
        var s = db.prepare("SELECT rowid AS id, short, long FROM url WHERE short=?");
        s.get(key, function(err, row) {
                //console.log(""+row.long+":"+url+":"+(row.long == url));
                if(row != null){
                        console.log(row.id + ":" + row.short + ":" + row.long);
                        if(row.long == url){
                                return back302(res, key);
                        }else{
                                return back302(res, shortener(url + Math.random()));
                        }
                        console.log(exist);
                }else{
                        return back302(res, write_db(key, url));
                }
        });
        s.finalize();
}

function back302(res, key){
        res.writeHead(200, {'content-type': 'text/plain'});
        let output = "http://chime.icu/" + key;
        res.write(output);
        //console.log(output);
        res.end();
}

function write_db(key, url){
        let i = db.prepare("INSERT INTO url VALUES (?,?)");
        //console.log(url);
        i.run([key, url]);
        i.finalize();
        /*db.each("SELECT rowid AS id, short, long FROM url", function(err, row) {
                console.log(row.id + ":" + row.short + ":" + row.long);
        });*/
        return key;
        //db.close();
}

function orig_url(pathname, res){
        //var db = new sqlite3.Database('url.db');
        let hash = pathname.substring(1,8);
        //let out = "";
        var s = db.prepare("SELECT rowid AS id, short, long FROM url WHERE short=?");
        s.get(hash, function(err, row) {
                //out = row.long;
                if(row){
                        //console.log(row.id + ":" + row.short + ":" + row.long);
                        res.writeHead(302, {'Location': row.long});
                        res.end();
                }else{
                        res.writeHead(404, {'content-type': 'text/plain'});
                        res.write("404");
                        res.end();
                }
                return;
        });
        s.finalize();
}

