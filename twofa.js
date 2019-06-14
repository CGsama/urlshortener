var tfa = require('2fa');
var fs = require('fs');
function gen2fa(){
	tfa.generateKey(32, function(err, key) {
		console.log(key)
		tfa.generateGoogleQR('C3LO', 'stnr.icu', key, function(err, qr){
			console.log(qr);
		});
		var config = JSON.parse(fs.readFileSync('config.json'));
		config.totp = key;
		fs.writeFileSync('config.json', JSON.stringify(config));
	});
}

gen2fa();