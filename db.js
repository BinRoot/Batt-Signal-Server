// mongo n shit
var mongo = require('mongodb'),
Server = mongo.Server,
Db = mongo.Db;

var server, db;

Database = function(){};
Database.prototype.init = function() {
	server = new Server('localhost', 27017, {auto_reconnect: true});
	db = new Db('mydb', server);
}

Database.prototype.testFetch = function(callback) {
	db.open(function(err, db) {
		if(!err) {
			console.log('connected!');
			callback(true);
		} else {
			callback(false);
		}
	});
}

module.exports.Database = Database;