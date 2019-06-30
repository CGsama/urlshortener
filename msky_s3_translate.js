var http = require('http');
var mime = require('mime-types');
var url = require('url');
var {Pool, Client} = require('pg');

var config = JSON.parse(fs.readFileSync('config.json')).msky;

var db_config = {user: config.dbuser, host: config.dbhost, database: config.dbname, password: config.dbpasswd, port: config.dbport};

function searchByAccessKey(key, cb){
	let db = new Pool(db_config);
	db.query('SELECT name, "accessKey", "webpublicAccessKey" FROM drive_file WHERE "accessKey" LIKE $1', [key], function(err, res){
		//console.log(err, res);
		db.end();
		cb(res.rows[0] == null ? "" : res.rows[0].name);
	})
}


http.createServer(app).listen(46123);

function app(req, res){
	let key = url.parse(req.url).pathname.substring(1);
	searchByAccessKey(key, function(fn){
		console.log(key + "|" + fn);
		let headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': "GET"};
		headers['Content-Type'] = mime.lookup(fn);
		headers['Content-Disposition'] = 'filename="' + fn + '"';
		headers['Content-Location'] = 'https://files.misskey.gothloli.club/' + key;
		res.writeHead(200, headers);
		res.end();
	})
}