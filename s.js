//var domain = "http://chime.icu/";
//var errjump = "http://corsethime.com/";

var requestIp = require('request-ip');
var http = require('http');
var url = require('url');
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
//var db = new sqlite3.Database(':memory:');
var db = new sqlite3.Database('url.db');
var crypto = require('crypto');
var hash = crypto.createHash('sha256');


//process.stdin.resume();

var rawconfig = fs.readFileSync('config.json');
var config = JSON.parse(rawconfig);
var domain = config.domain;
var errjump = config.errjump;
var port = config.port;
var logging = config.logging;
var usehost = config.usehost;
var googleprefix = config.googleprefix;

var hostmap = JSON.parse(fs.readFileSync('hostmap.json'));

db.serialize(function() {
	var server = http.createServer(function(req, res){
		if(logging){
			let i = db.prepare("INSERT INTO history VALUES (?,?,?)");
			//console.log(req);
			i.run([(new Date()).toISOString(), requestIp.getClientIp(req), req.headers.host + req.url]);
			i.finalize();
		}
		log("request from " + requestIp.getClientIp(req) + " | " + req.headers.host + req.url);
		if(url.parse(req.url).pathname == '/shortener'){
			var send = false;
			if(url.parse(req.url).query != null){
				let target = url.parse(req.url,true).query.url;
				let base = url.parse(req.url,true).query.host
				if(target != null){
					shortener(base == null ? req.headers.host : base, res, target);
					send = true;
				}
			}
			if(!send){
				res.writeHeader(200, {"Content-Type": "text/html"});
				res.write(prepweb(req.headers.host));
				res.end(); 
			}
		}else{
			orig_url(req.headers.host, url.parse(req.url).pathname, res);
		}
	});
	server.listen(port);
});

/*process.on('SIGINT', function () {
  console.log('Close db & exit');
  db.close();
});*/


function shortener(host, res, url){
	//var db = new sqlite3.Database('url.db');
	//db.run("CREATE TABLE url (short TEXT, long TEXT)");
	let key = crypto.createHash('sha256').update("" + url).digest('base64').replace(/\W/g, "").substring(0,6);

	let empty = true;
	var s = db.prepare("SELECT rowid AS id, short, long FROM url WHERE short=?");
	s.get(key, function(err, row) {
		//console.log(""+row.long+":"+url+":"+(row.long == url));
		if(row != null){
			//console.log(row.id + ":" + row.short + ":" + row.long);
			if(row.long == url){
				return back302(url, host, res, key);
			}else{
				return back302(url, host, res, shortener(host, res, url + Math.random()));
			}
			//console.log(exist);
		}else{
			return back302(url, host, res, write_db(key, url));
		}
	});
	s.finalize();
}

function back302(url, host, res, key){
	res.writeHead(200, {'content-type': 'text/plain'});
	let output = (usehost ? ("http://" + host + "/") : domain) + key;
	log("request shortener: " + url + " --> " + output);
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

function orig_url(host, pathname, res){
	//var db = new sqlite3.Database('url.db');
	let hash = pathname.substring(1,8);
	//let out = "";
	var s = db.prepare("SELECT rowid AS id, short, long FROM url WHERE short=?");
	s.get(hash, function(err, row) {
		//out = row.long;
		if(row){
			//console.log(row.id + ":" + row.short + ":" + row.long);
			log("redirect shortener: " + host + pathname + " --> " + row.long);
			res.writeHead(302, {'Location': row.long});
		}else{
			let unknown = true;
			for (const [key, value] of Object.entries(hostmap)) {
				//console.log(key, value);
				if(host == key || pathname.substring(1) == key){
					log("redirect mapping: " + host + pathname + " --> " + value);
					res.writeHead(302, {'Location': value});
					unknown = false;
				}
			}
			if(unknown){
				log("WARNING invalid request: " + host + pathname);
				if(errjump == "404"){
					res.writeHead(404, {'content-type': 'text/plain'});
					res.write("404");
				}else if(errjump == "google"){
					res.writeHead(302, {'Location': "https://www.google.com/search?q=" + encodeURI(pathname.substring(1))});
				}else if(errjump == "googleprefix"){
					res.writeHead(302, {'Location': "https://www.google.com/search?q=" + googleprefix + encodeURI(pathname.substring(1))});
				}else{
					res.writeHead(302, {'Location': errjump + pathname.substring(1)});
				}
			}
		}
		res.end();
		return;
	});
	s.finalize();
}

function prepweb(host){
	let webpage = "<html>\r\n<head>\r\n<meta charset=\"utf-8\">\r\n<meta name=\"author\" content=\"CorsetHime\">\r\n<title>URL Shortener<\/title>\r\n<\/head>\r\n<body>\r\n<div style=\"text-align:center\"><input type=\"button\" value=\"URL Shortener\" onclick=\"shortener();\"\/><\/div>\r\n<script type=\"text\/javascript\">\r\nfunction shortener() {\r\n  var orig_url = prompt(\"Please enter the url wants to be shortten\",\""
	+ (usehost ? ("http://" + host + "/") : domain)
	+ "\");\r\n  try{\r\n    var xhr = new XMLHttpRequest();\r\n    xhr.open(\"GET\", \""
	+ (usehost ? ("http://" + host + "/") : domain)
	+ "shortener?url=\" + orig_url, false);\r\n    xhr.send(null);\r\n    console.log(xhr);\r\n    prompt(\"Your input has been shortten\", xhr.responseText);\r\n  }catch(err){\r\n\twindow.open(\""
	+ (usehost ? ("http://" + host + "/") : domain)
	+ "shortener?url=\" + orig_url);\r\n  }\r\n}\r\n<\/script>\r\n<\/body>\r\n<\/html>";
	return webpage;
}

function log(str){
	console.log(str)
	fs.appendFileSync('log.txt', (new Date()).toISOString() + " | " + str + "\n");
}