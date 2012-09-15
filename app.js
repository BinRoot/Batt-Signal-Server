var express = require('express');
var http = require('https');
var httpnormal = require('http');
var qs = require('querystring');
var Database = require('./db').Database;

var app = express.createServer(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));

var db = new Database();

app.get('/', function(request, response) {
	response.send('batt fuckin signal');
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
			if(POST_data.name === undefined || POST_data.registrationID === undefined 
				|| POST_data.phoneNumber === undefined || POST_data.password === undefined) {
				response.send('{ "status": 400, "message": "A required field was not submitted.", "response": {} }');
			} else {
				db.connect(function(validConnection) {
					if(validConnection) {
						db.createNewUser([
							{ name: POST_data.registration.name },
							{ registrationID: POST_data.registration.registrationID },
							{ phoneNumber: POST_data.registration.phoneNumber },
							{ password: POST_data.registration.password }
						], function(status) {
							if(status === true) {
								response.send('created new user!');
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