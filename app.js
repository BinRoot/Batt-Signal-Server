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
			response.send('got the following data: '+JSON.stringify(POST_data));
		});
	}
});

app.get('/mongotest', function(request, response) {
	console.log(typeof db);
	db.init();
	db.testFetch(function(status) {
		if(status) {
			response.send('connected!');
		} else {
			response.send('did not connect');
		}
	});
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});