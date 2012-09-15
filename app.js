var express = require('express');
var http = require('https');
var httpnormal = require('http');


var app = express.createServer(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));

app.get('/', function(request, response) {
	response.send('test');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});