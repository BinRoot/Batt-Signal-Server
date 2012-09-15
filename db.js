// mongo n shit
var mongo = require('mongodb'),
Server = mongo.Server,
Db = mongo.Db;
var assert = require('assert');

var server, db;

Database = function(){};

// basic connection... required each time DB is used
Database.prototype.connect = function(callback) {
	mongo.connect(process.env.MONGOLAB_URI || 'mongodb://localhost:27017/test', {}, function(err, database) {
		database.addListener("error", function(error) {
			callback(false);
		});
		db = database;
		callback(true);
	});
};

// creates a user. expects data parameter to be properly formatted.
Database.prototype.createNewUser = function(data, callback) {
	db.collection('batt_users', function(err, collection) {
		// first check to see if this user exists
		collection.count({phoneNumber: data[0].phoneNumber}, function(err, count) {
			if(count !== 0) {
				callback({status: false, msg: 'User already exists', reason: 'duplicate_user'});
			} else {
				// doesn't exist, go ahead and insert
				collection.insert(data, {safe: true}, function(err, ids) {
					if(err === null) 
						callback({status: true});
					else
						callback({status: false, msg: 'Error with collection.insert', reason: 'other'});
				});
			}
		});
	});
};

module.exports.Database = Database;