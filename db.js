// mongo n shit
var mongo = require('mongodb'),
Server = mongo.Server,
Db = mongo.Db,
BSON = mongo.BSONPure;
var gcm = require('node-gcm');
var crypto = require('crypto');

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

// works with verfication doc. creates a new phoneNumber <==> verification connection
// data has { phoneNumber: [string], verificationCode: [string] }
Database.prototype.createNewVerification = function(data, callback) {
	db.collection('verification', function(err, collection) {
		// check to see if number exists... send a new verification code if so
		collection.count({phoneNumber: data.phoneNumber}, function(err, count) {
			if(count !== 0) {
				collection.update({phoneNumber: data.phoneNumber}, {$set: {verificationCode: data.verificationCode}});
				callback({status: true});
			} else {
				collection.insert({
					phoneNumber: data.phoneNumber,
					verificationCode: data.verificationCode
				}, {safe: true}, function(err, doc) {
					if(err === null) 
						callback({status: true});
					else
						callback({status: false, msg: 'Error with collection.insert', reason: 'other'});
				});
			}
		});
	});
};

// checks what the user entered as the verification code against the DB
// data has { phoneNumber: [string], verficationCode: [string] }
Database.prototype.verifyNewUser = function(data, callback) {
	db.collection('verification', function(err, collection) {
		collection.findOne({phoneNumber: data.phoneNumber}, function(err, doc) {
			// NOTE: verificationCode is saved on DB as Number, not String
			if(doc.verificationCode === parseInt(data.verificationCode)) {
				callback({ result: true });
			} else {
				callback({ result: false });
			}
		});
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

// adds new friendships
// friendships are open
Database.prototype.createFriendships = function(data, callback) {
	db.collection('friends', function(err, collection) {
		var numFinished = 0;
		var goal = data.friends.length;
		for(var i = 0; i < goal; i++) {
			// TODO you can currently create a new friendship if it already exists
			collection.update({'people': [data.originPhone, data.friends[i]], 'requires': data.friends[i]},
			{'people': [data.originPhone, data.friends[i]], 'requires': data.friends[i]},
			{'upsert': true}, function(err) {
				numFinished++;
				if(numFinished === goal) {
					callback(true);
				}
			});
		}
	});
};

// resolves a friendship
// either confirm or deny
Database.prototype.resolveFriendship = function(data, callback) {
	db.collection('friends', function(err, collection) {
		if(data.confirm == 'true') {
			collection.update({'_id': BSON.ObjectID(data._id)}, {'$set': { 'requires': 'none' } }, function(err) {
				if(err === undefined) {
					callback(true);
				} else {
					console.log('error in resolveFriendship: '+err);
					callback(false);
				}
			});
		} else {
			collection.remove({'_id': BSON.ObjectID(data._id)}, function(err) {
				if(err === undefined) {
					callback(true);
				} else {
					console.log('error in resolveFriendship: '+err);
					callback(false);
				}
			});
		}
	});
};

// returns a list of friends to the callback function
// data has a phoneNumber
// object that's returned holds phone numbers
Database.prototype.getFriends = function(data, callback) {
	db.collection('friends', function(err, collection) {
		var criteria = data.wantExtras ? {'people': data.phoneNumber} : {'people': data.phoneNumber, 'requires': 'none'};
		collection.find(criteria).toArray(function(err, results) {
			var friends = [];
			for(var i = 0; i < results.length; i++) {
				if(data.wantExtras === true)
					friends.push(results[i]);
				else
					friends.push(results[i].people[0] === data.phoneNumber ? results[i].people[1] : results[i].people[0]);
			}
			callback(friends);
		});
	});
};

// updates old stats
// this should be called by the client
Database.prototype.updateStats = function(data, callback) {
	db.collection('batt_users', function(err, collection) {
		collection.update({'phoneNumber': data.phoneNumber}, {'$set': { 
			'battery': data.newBattery, 
			'signal': data.newSignal,
			'lastModified': Date.now()
		} }, function(err) {
			if(err === undefined) {
				callback(true);
			} else {
				console.log('error in updateStats: '+err);
				callback(false);
			}
		});
	});	
};

// triggers refresh of old stats
// only pings phones that haven't been updated in 30 min
// data is a list of friend phoneNumbers
Database.prototype.triggerRefresh = function(data, callback) {
	db.collection('batt_users', function(err, collection) {
		collection.find({'phoneNumber': {'$in': data} }).toArray(function(err, results) {
			var registrationIds = []; // for GCM
			console.log('inside triggerRefresh, results is '+JSON.stringify(results));
			// for each phone number, check to see if it's been updated within the last 30 min then update
			for(var i = 0; i < results.length; i++) {
				if(results[i].lastModified === undefined || Date.now() - results[i].lastModified > 1800000) {
					registrationIds.push(results[i].registrationID);
				}
			}

			if(registrationIds.length > 0) {
				// call GCM to trigger phone update
				var message = new gcm.Message();
				var sender = new gcm.Sender('AIzaSyDnvHuy_N5S3ckXHFTCYqkHUoWc110CEm8');

				message.addData('serverMessage', 'performUpdate');

				sender.send(message, registrationIds, 4, function (result) {
				    console.log('result from GCM send is '+result);
				    callback(true);
				});
			} else {
				callback(true);
			}
		});
	});
};

/*
FRONT-END HEAVY STUFF
*/
Database.prototype.verifyLogin = function(data, callback) {
	db.collection('batt_users', function(err, collection) {
		var encryptedPass = crypto.createHash('md5').update(data.password).digest('hex');
		collection.findOne({'phoneNumber': data.phoneNumber, 'password': encryptedPass}, function(err, doc) {
			callback(doc);
		});
	});
};

// generic filterable query
Database.prototype.query = function(collectionName, fieldFilters, callback) {
	db.collection(collectionName, function(err, collection) {
		collection.find(fieldFilters).toArray(function(err, results) {
			callback(results);
		});
	});
};



module.exports.Database = Database;