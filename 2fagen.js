var tfa = require('2fa');
var fs = require('fs');
var base32 = require('thirty-two');
var crypto = require('crypto');
var QR = require('qr-image');

function gen2fa(){
	tfa.generateKey(32, function(err, key) {
		console.log(key)
		console.log(Buffer.from(key, 'ascii').toString('hex'));
		tfa.generateGoogleQR('C3LO', 'corsethime', key, function(err, qr){
			console.log(qr);
		});
		var config = JSON.parse(fs.readFileSync('config.json'));
		config.totp = key;
		fs.writeFileSync('config.json', JSON.stringify(config));
	});
}

//gen2fa();

genqr('C3LO', randomnonspaceprintable(5) + '@' + Date.now(), 20, function(err, qr){
			console.log(qr);
		});



function generateUrl(name, account, key) {
  return 'otpauth://totp/' + encodeURIComponent(account)
           + '?issuer=' + encodeURIComponent(name)
           + '&secret=' + base32.encode(key).toString().replace(/=/g, '');
};

function genqr(name, account, len, cb) {

  var key = randomnonspaceprintable(len);
  var data = generateUrl(name, account, key);
  
  printStr(key);

  var formatter = function(buf) {
    return 'data:image/png;base64,' + buf.toString('base64')
  };

  var qrOpts = { type: 'png' };

  var pngStream = QR.image(data, qrOpts);

  var pngData = [];
  pngStream.on('data', function(d) { pngData.push(d); });
  pngStream.on('end', function() {
    var png = Buffer.concat(pngData);
    cb(null, formatter(png));
  });
};

function randomnonspaceprintable(len){
	var str = "";
	for(var i = 0; i < len; i++){
		str += String.fromCharCode(Math.floor(33 + (rand() * 94)));
	}
	return str;
}

function printStr(str){
	console.log("ASCII: " + str);
	console.log("HEX: " + Buffer.from(str, 'ascii').toString('hex'));
	console.log("BASE32: " + base32.encode(str).toString().replace(/=/g, ''));
}

function rand(){
	var k = new Uint32Array(1);
	crypto.randomFillSync(k);
	return k[0]/4294967296;
}