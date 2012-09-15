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

app.get('/getcode', function(request, response){
		// build parameters into a string
			var client = new TwilioClient('ACc0afd9286b84e56d6780acff1bb28852', '253dea99d52d3a88c21a33bbbf8e2806', 'http://aqueous-citadel-7149.herokuapp.com');
			var phone = client.getPhoneNumber('+14438981316');
			phone.setup(function() {
				phone.sendSms('+17572145722', 'sup nigga', null, function(sms) {
				            sms.on('processed', function(reqParams, response) {
				                response.send('Message processed');
				            });
				            });
				        });
});

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
						response.send('{ "status": 500, "message": "Error connecting to the database.", "response": {} }');
					}
				});
			}
		});
	}
});


var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});