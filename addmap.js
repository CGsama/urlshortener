var fs = require('fs');
var readline = require('readline-sync');
var hostmap;
try{
	hostmap = JSON.parse(fs.readFileSync('hostmap.json'));
}
catch(e){
	hostmap = {};
}
finally{
	key = readline.question("Which host? ");
	value = readline.question("Jump to where? ");
	hostmap[key] = value;
	fs.writeFileSync('hostmap.json', JSON.stringify(hostmap));
}
