var express = require('express');
var http = require('https');
var httpnormal = require('http');
var qs = require('querystring');
var Database = require('./db').Database;
var TwilioClient = require('twilio').Client,
      Twiml = require('twilio').Twiml,
      sys = require('sys');
var TwilioRestClient = require('twilio').RestClient;


var app = express.createServer(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));

var db = new Database();

/*
INTERNAL API ENDPOINTS
*/

// returns a code when given a number
app.post('/getcode', function(request, response){
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);

			var twilio = new TwilioRestClient('ACc0afd9286b84e56d6780acff1bb28852', 
				'253dea99d52d3a88c21a33bbbf8e2806');
			// generate phoneNumber <-> verification code pair
			var vCode = Math.floor(Math.random()*1000); // code can be between 1 and 3 digits
			twilio.sendSms('14438981316', POST_data.phoneNumber, 'Your Batt Signal verification code is: '+vCode, '', function(body) {
				console.log('success, body is '+JSON.stringify(body));
				response.send({'status': 200});
			});
		});
	}
});

// handles registration, receives name, rID, phone number, password
app.post('/register', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			// validate POST data has all information
			console.log('post data is '+JSON.stringify(POST_data));
			if(POST_data.name === undefined || POST_data.registrationID === undefined 
				|| POST_data.phoneNumber === undefined || POST_data.password === undefined) {
				response.send('{ "status": 400, "message": "A required field was not submitted.", "response": {} }');
			} else if(POST_data.phoneNumber.length !== 10) {
				response.send('{ "status": 400, "message": "Phone number must be a 10-digit phone number.", "response": {} }');
			} else {
				// connect to DB, create proper data object, and insert into DB
				db.connect(function(validConnection) {
					if(validConnection) {
						db.createNewUser([
							{ name: POST_data.name,
							  registrationID: POST_data.registrationID,
							  phoneNumber: POST_data.phoneNumber,
							  password: POST_data.password }
						], function(statusObj) {
							if(statusObj.status === true) {
								// inserted new user, everything went better than expected
								response.send('created new user!');
							} else {
								response.send('error: '+statusObj.msg);
							}
						});
					} else {
						response.send('{ "status": 500, "message": "errorror connecting to the database.", "response": {} }');
					}
				});
			}
		});
	}
});

// receives { phoneNumber: [string], verificationCode: [string] }
// checks to see if it works out in the DB
// returns { result: [bool] }
app.post('/verify', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			// connect to DB, then see if verification code checks out
			db.connect(function(validConnection) {
				if(validConnection) {
					db.verifyNewUser(POST_data, function(statusObj) {
						response.send(JSON.stringify(statusObj));
					});
				} else {	
					response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
				}
			});
		});
	}
});

// receives { phoneNumber: [string] }
// query db.friends.find({ people: phoneNumber, requires: 'none' })
// returns { friends: [array of {name, phoneNumber}] }
app.post('/getfriends', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			// connect to DB, then return friends list
			db.connect(function(validConnection) {
				if(validConnection) {
					db.query('friends', {'people': POST_data.phoneNumber, 'requires': 'none'}, function(results) {
						var friendsToGet = [];
						// do some finangling with query result to get relevant phone number
						// for next query
						for(var i = 0; i < results.length; i++) {
							friendsToGet.push( results[i].people[0] === POST_data.phoneNumber ? results[i].people[1] : results[i].people[0] );
						}
						// new query to batt_users to actually return relevant results
						db.query('batt_users', {'phoneNumber': {'$in': friendsToGet } }, function(peopleResults) {
							var returnMe = [];
							for(var i = 0; i < peopleResults.length; i++) {
								returnMe.push({'name': peopleResults[i].name, 'phoneNumber': peopleResults[i].phoneNumber});
							}
							response.send(returnMe);
						});
					});
				} else {	
					response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
				}
			});
		});
	}
});

// receives { phoneNumbers: [array] }
// figures out which of these numbers are already users in the DB
// returns { validNumbers: [array] }. can be 0 length. 
app.post('/getexistingusers', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			POST_data['phoneNumbers'] = JSON.parse(POST_data['phoneNumbers']);
			// gotta convert each to a string
			POST_data['phoneNumbers'].forEach(function(value, index, arr) {
				arr[index] = value.toString();
			});
			console.log('postdata is '+JSON.stringify(POST_data));

			// connect to DB, then return friends list
			db.connect(function(validConnection) {
				if(validConnection) {
					db.query('batt_users', {'phoneNumber': {'$in': POST_data['phoneNumbers']} }, function(results) {
						var returnArray = [];
						for(var i = 0; i < results.length; i++) {
							returnArray.push(results[i].phoneNumber);
						}
						response.send({validNumbers: returnArray});
					});
				} else {	
					response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
				}
			});
		});
	}
});

// receives { originPhone: [string], friends: [array] }
// creates new entries in DB for each friend pair
// returns { status: 200 }
app.post('/addfriend', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			POST_data['friends'] = JSON.parse(POST_data['friends']);
			// gotta convert each to a string
			POST_data['friends'].forEach(function(value, index, arr) {
				arr[index] = value.toString();
			});

			db.connect(function(validConnection) {
				if(validConnection) {
					db.createFriendships(POST_data, function(result) {
						if(result) {
							response.send({'status': 200});
						} else {
							response.send({'status': 500, 'message': 'Error writing friends'});
						}
					});
				} else {	
					response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
				}
			});
		});
	}
});

// receives { phoneNumber: [string] } 
// check to see if any friends entries requires actions from this phone number
// returns { actionRequired: [array of {id, phoneNumber, name}] }
app.post('/pendingfriendrequests', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			// connect to DB, then return list of pending friends
			db.connect(function(validConnection) {
				if(validConnection) {
					db.query('friends', {'requires': POST_data.phoneNumber }, function(results) {
						console.log('outside results is '+JSON.stringify(results));
						var friendsNumbers = [];
						for(var i = 0; i < results.length; i++) {
							friendsNumbers.push(POST_data.phoneNumber === results[i].people[0] ? results[i].people[1] : results[i].people[0]);
						}
						console.log('friendsNumbers is '+friendsNumbers);
						db.query('batt_users', {'phoneNumber': {'$in': friendsNumbers} }, function(results) {
							console.log('inside results is '+JSON.stringify(results));
							var returnArray = [];
							for(var i = 0; i < results.length; i++) {
								returnArray.push(results[i]);
							}
							response.send({actionRequired: returnArray});
						});
					});
				} else {	
					response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
				}
			});
		});
	}
});

// receives { _id: [ObjectId as string], confirm: [bool] }
// if true, set requires field to none. else remove friendship
// returns { status: 200 }
app.post('/confirmfriend', function(request, response) {
	// build parameters into a string
	if(request.method === 'POST') {
		var body = '';
		request.on('data', function(data) {
			body += data;
		});
		request.on('end', function() {
			var POST_data = qs.parse(body);
			// connect to DB, and update friends collection appropriately
			db.connect(function(validConnection) {
				if(validConnection) {
					db.resolveFriendship(POST_data, function(result) {
						if(result) {
							response.send({'status': 200});
						} else {
							response.send({'status': 500, 'message': 'Error manipulating the database'});
						}
					});
				} else {	
					response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
				}
			});
		});
	}
});

/*
GOOGLE CLOUD MESSENGER
*/

/*
FRONT END VIEWS
*/

app.get('/', function(request, response) {
	response.send('batt fuckin signal');
});

app.get('/signup', function(request, response) {
	response.send('batt fuckin signal');
});

app.get('/login', function(request, response) {
	response.send('batt fuckin signal');
});

app.get('/home', function(request, response) {
	response.send('batt fuckin signal');
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});