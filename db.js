// mongo n shit
var mongo = require('mongodb'),
Server = mongo.Server,
Db = mongo.Db;
var assert = require('assert');

var server, db;

Database = function(){};

// basic connection... required each time 
Database.prototype.connect = function(callback) {
	mongo.connect(process.env.MONGOLAB_URI, {}, function(err, database) {
		database.addListener("error", function(error) {
			callback(false);
		});
		db = database;
		callback(true);
	});
};

Database.prototype.createNewUser = function(data, callback) {
	db.collection('batt_users', function(err, collection) {
		collection.insert(data, {safe: true}, function(err, ids) {
			assert(null, err);
			callback(true);
		});
	});
};

Database.prototype.testFetch = function(callback) {
	db.collection('test2', function(err, collection) {
		collection.count(function(err, count) {
			console.log('count is '+count);
		});
	});
}

module.exports.Database = Database;