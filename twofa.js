var tfa = require('2fa');
var fs = require('fs');
var readline = require('readline-sync');
function gen2fa(org, url){
	tfa.generateKey(32, function(err, key) {
		console.log(key)
		tfa.generateGoogleQR(org, url, key, function(err, qr){
			console.log(qr);
		});
		var config = JSON.parse(fs.readFileSync('config.json'));
		config.totp = key;
		fs.writeFileSync('config.json', JSON.stringify(config));
	});
}
let org = readline.question("What is the org? ");
let url = readline.question("What is the url? ");
gen2fa(org, url);
