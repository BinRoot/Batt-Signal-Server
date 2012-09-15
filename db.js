// mongo n shit
var mongo = require('mongodb'),
Server = mongo.Server,
Db = mongo.Db;

var server, db;

Database = function(){};
Database.prototype.init = function(callback) {
	// server = new Server('mongodb://ds037627-a.mongolab.com/heroku_app7605836', 37627, {auto_reconnect: true});
	// db = new Db('mydb', server);
	//mongo.connect('mongodb://heroku_app7605836:217029@ds037627-a.mongolab.com/heroku_app7605836', {}, function(err, database) {
	mongo.connect(process.env.MONGOLAB_URI, {}, function(err, database) {
		database.addListener("error", function(error) {
			callback(false);
		});
		db = database;
		callback(true);
	});
}	

Database.prototype.testFetch = function(callback) {
	db.collection('test', function(err, collection) {
		collection.count(function(err, count) {
			console.log('count is '+count);
		});
	});
}

module.exports.Database = Database;