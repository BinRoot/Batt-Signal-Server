var express = require('express');
var http = require('https');
var httpnormal = require('http');
var qs = require('querystring');
var Database = require('./db').Database;
var TwilioClient = require('twilio').Client,
      Twiml = require('twilio').Twiml,
      sys = require('sys');


var app = express.createServer(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));

var db = new Database();

app.get('/', function(request, response) {
	response.send('batt fuckin signal');
});

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
			var client = new TwilioClient('ACc0afd9286b84e56d6780acff1bb28852', 
				'253dea99d52d3a88c21a33bbbf8e2806', 'aqueous-citadel-7149.herokuapp.com');
			var phone = client.getPhoneNumber('+14438981316');
			phone.setup(function() {
				// generate phoneNumber <-> verification code pair
				var vCode = Math.floor(Math.random()*1000); // code can be between 1 and 3 digits
				
				// create new phoneNumber <-> verification record in DB
				db.connect(function(validConnection) {
					if(validConnection) {
						db.createNewVerification({
							phoneNumber: POST_data.phoneNumber,
							verificationCode: vCode
						}, function(status) {
							// now send text with verification code
							if(status.status === true) {
								phone.sendSms(POST_data.phoneNumber, 'Your Batt Signal verification code is: '+vCode, null, function(sms) {
									console.log('inside sendSms, sms is '+JSON.stringify(sms));
									// don't bother with verification here... just send
					                response.send('{status: 200}');
						        });
							} else {
								response.send('error: '+status.msg);	
							}
						});
					} else {
						response.send('{ "status": 500, "message": "errorror connecting to the database.", "response": {} }');
					}
				});
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


		});
	}
});

// receives { friendshipId: [ObjectId], confirm: [bool] }
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


		});
	}
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});