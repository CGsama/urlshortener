var fs = require('fs');
var readline = require('readline-sync');
var prefixmap;
try{
	prefixmap = JSON.parse(fs.readFileSync('prefixmap.json'));
}
catch(e){
	prefixmap = {};
}
finally{
	key = readline.question("Which host? ");
	value = readline.question("Search prefix? ");
	prefixmap[key] = value;
	fs.writeFileSync('prefixmap.json', JSON.stringify(prefixmap));
}
