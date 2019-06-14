//var domain = "http://chime.icu/";
//var errjump = "http://corsethime.com/";

var requestIp = require('request-ip');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
//var db = new sqlite3.Database(':memory:');
var db = new sqlite3.Database('url.db');
var crypto = require('crypto');
var hash = crypto.createHash('sha256');
var buffer = require("Buffer");
var mime = require('mime-types');
var tfa = require('2fa');


//process.stdin.resume();

var rawconfig = fs.readFileSync('config.json');
var config = JSON.parse(rawconfig);
var domain = config.domain;
var errjump = config.errjump;
var port = config.port;
var logging = config.logging;
var usehost = config.usehost;
var webjump = config.webjump;
var totp = config.totp;

var hostmap = JSON.parse(fs.readFileSync('hostmap.json'));
var prefixmap = JSON.parse(fs.readFileSync('prefixmap.json'));

var httpscert = {
    key: fs.readFileSync(config.privkey),
    cert: fs.readFileSync(config.fullchain)
};

db.serialize(function() {
	http.createServer(http_app).listen(port);
	https.createServer(httpscert, https_app).listen(443);
});

/*process.on('SIGINT', function () {
  console.log('Close db & exit');
  db.close();
});*/

function http_app(req, res){app(req, res, "");}
function https_app(req, res){app(req, res, "s");}

function app(req, res, https){
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
			let target = decodeURI(Buffer.from(url.parse(req.url,true).query.url, 'base64').toString('ascii'));
			let base = url.parse(req.url,true).query.host
			if(target != null){
				shortener(base == null ? req.headers.host : base, res, target, https);
				send = true;
			}
		}
		if(!send){
			if(req.headers.host == domain && https != "s"){
				res.writeHead(302, {'Location': "https://" + domain + "/shortener"});
			}else{
				res.writeHeader(200, {"Content-Type": "text/html"});
				res.write(prepweb(req.headers.host, https));
			}
			res.end();
		}
	}else if(url.parse(req.url).pathname == '/surl.js'){
		res.writeHeader(200, {"Content-Type": "application/javascript"});
		res.write(prepscript(req.headers.host, https));
		res.end();
	}else if(url.parse(req.url).pathname == '/favicon.ico'){
		return_file(res, "favicon.ico");
	}
	else if(url.parse(req.url).pathname == '/apple-touch-icon.png'){
		return_file(res, "apple-touch-icon.png");
	}else if(url.parse(req.url).pathname.match(new RegExp("(^\\/check)(\\d\\d\\d\\d\\d\\d$)","g")) != null){
		twofa(url.parse(req.url).pathname.substring(6,12), res)
	}else{
		orig_url(req.headers.host, url.parse(req.url).pathname, res);
	}
}


function shortener(host, res, url, https){
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
				return back302(url, host, res, key, https);
			}else{
				return shortener(host, res, url + Math.random(), https);
			}
			//console.log(exist);
		}else{
			return back302(url, host, res, write_db(key, url), https);
		}
	});
	s.finalize();
}

function back302(url, host, res, key, https){
	res.writeHead(200, {'content-type': 'text/plain', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': "GET"});
	let output = "http" + https + "://" + (usehost ? host : domain) + "/" + key;
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
			if(!webjump){
				res.writeHead(302, {'Location': encodeURI(row.long)});
			}else{
				res.writeHead(200, {'content-type': 'text/html', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': "GET"});
				res.write(prepwebjump(row.long));
			}
		}else{
			let unknown = true;
			for (const [key, value] of Object.entries(hostmap)) {
				//console.log(key, value);
				if(host == key || pathname.substring(1) == key){
					log("redirect mapping: " + host + pathname + " --> " + value);
					if(!webjump){
						res.writeHead(302, {'Location': encodeURI(value)});
					}else{
						res.writeHead(200, {'content-type': 'text/html', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': "GET"});
						res.write(prepwebjump(value));
					}
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
					let searchprefix = host;
					for (const [key, value] of Object.entries(prefixmap)) {
						//console.log(key, value);
						if(host == key){
							searchprefix = value;
							break;
						}
					}
					res.writeHead(302, {'Location': "https://www.google.com/search?q=" + searchprefix + encodeURI(pathname.substring(1))});
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

function prepweb(host, s){
	let webpage = "<html>\r\n<head>\r\n<meta charset=\"utf-8\">\r\n<meta name=\"author\" content=\"CorsetHime\">\r\n<title>URL Shortener<\/title>\r\n<\/head>\r\n<body>\r\n<div style=\"text-align:center\">\r\n<input type=\"button\" value=\"URL Shortener\" onclick=\"shortener();\"\/>\r\n<input type=\"button\" value=\"Current Page\" onclick=\"prompt_curr_surl();\"\/>\r\n<p><div style=\"text-align:center\">\r\n<p>\r\n&lt;script type=&quot;text\/javascript&quot; src=&quot;http" + s + ":\/\/" + host + "\/surl.js&quot;&gt;&lt;\/script&gt;\r\n&lt;input type=&quot;button&quot; value=&quot;Short URL&quot; onclick=&quot;prompt_curr_surl();&quot;\/&gt;\r\n<\/p>\r\n<\/div><\/p>\r\n<\/div>\r\n<script type=\"text\/javascript\" src=\"http" + s + ":\/\/" + host + "\/surl.js\"><\/script>\r\n<\/body>\r\n<\/html>";
	return webpage;
}

function log(str){
	console.log(str)
	fs.appendFileSync('log.txt', (new Date()).toISOString() + " | " + str + "\n");
}

function liststorage(res){
	var str = "";
	db.each("SELECT rowid AS id, short, long FROM url", function(err, row) {
		str += row.id + ":" + row.short + ":" + row.long + "\n";
	},function(){
		res.writeHead(200, {'content-type': 'text/plain'});
		res.write(str);
		res.end();
	});
}

function prepscript(host, s){
	let script = "var surlhost = \"" + host + "\";\r\nfunction shortener(){\r\n  let host = surlhost;\r\n  var orig_url = encodeURI(btoa(prompt(\"Please enter the url wants to be shortten\",window.location.href)));\r\n  let target_host = prompt(\"What host do you want to use?\",host);\r\n  try{\r\n    let xhr = new XMLHttpRequest();\r\n    xhr.open(\"GET\", \"http" + s + ":\/\/\" + host + \"\/shortener?url=\" + orig_url + \"&host=\" + target_host, false);\r\n    xhr.send(null);\r\n    prompt(\"Your input has been shortten\", xhr.responseText);\r\n  }catch(err){\r\n\twindow.open(\"http" + s + ":\/\/\" + host + \"\/shortener?url=\" + orig_url + \"&host=\" + target_host);\r\n  }\r\n}\r\nfunction surl(orig_url){\r\n  let host = surlhost;\r\n  let target_host = host;\r\n  let xhr = new XMLHttpRequest();\r\n  xhr.open(\"GET\", \"http" + s + ":\/\/\" + host + \"\/shortener?url=\" + encodeURI(btoa(orig_url)) + \"&host=\" + target_host, false);\r\n  xhr.send(null);\r\n  return xhr.responseText;\r\n}\r\nfunction prompt_curr_surl(){\r\n  prompt(\"Current page\",surl(window.location.href));\r\n}";
	return script;
}
function prepwebjump(url){
	let html = "<!DOCTYPE html>\r\n<html>\r\n<head>\r\n<\/head>\r\n<body>\r\n\t<script>\r\n\t  var link = document.createElement(\'meta\');\r\n\t  link.setAttribute(\'http-equiv\', \'refresh\');\r\n\t  link.setAttribute(\'content\', \"0; url=" + url.replace(/[\\"']/g, '\\$&') + "\" + window.location.href);\r\n\t  document.getElementsByTagName(\'head\')[0].appendChild(link);\r\n\t<\/script>\r\n<\/body>\r\n<\/html>";
	return html;
}

function return_file(res, path){
	try{
		let data = fs.readFileSync(path);
		res.writeHeader(200, {"Content-Type": mime.lookup(path)});
		res.write(data);
	}catch(e){
		res.writeHead(404, {'content-type': 'text/plain'});
		res.write("404");
	}finally{
		res.end();
	}
}

function twofa(code, res){
	let validTOTP = tfa.verifyTOTP(totp, code);
	log("login to list with code: " + code + " valid? " + validTOTP);
	if(validTOTP){
		liststorage(res);
	}else{
		res.writeHead(404, {'content-type': 'text/plain'});
		res.write("404");
		res.end();		
	}
}