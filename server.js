const path = require('path');
const fs = require('fs');
const ws = require('ws');
const cpen322 = require('./cpen322-tester.js');
const express = require('express');

function logRequest(req, res, next){
	console.log(`${new Date()}  ${req.ip} : ${req.method} ${req.path}`);
	next();
}

const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// express app
let app = express();

app.use(express.json()) 						// to parse application/json
app.use(express.urlencoded({ extended: true })) // to parse application/x-www-form-urlencoded
app.use(logRequest);							// logging for debug

// serve static files (client-side)
app.use('/', express.static(clientApp, { extensions: ['html'] }));
app.listen(port, () => {
	console.log(`${new Date()}  App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});


var chatrooms=[];
var messages={};
var Room = function(id, name, image='assets/everyone-icon.png'){
    this.id = id;
    this.name = name;
    this.image = image;
}
var broker=new ws.Server({ port: 8000 });

chatrooms.push(new Room(chatrooms.length.toString(),"CPEN"));
chatrooms.push(new Room(chatrooms.length.toString(),"CPSC"));
messages[chatrooms[0].id]=[];
messages[chatrooms[1].id]=[];
broker.on("connection", function(ws){
	ws.on('message', function message(data) {
		var r=JSON.parse(data);
		if(r.roomId in messages)
			messages[r.roomId].push({username: r.username, text:r.text});
		else
			messages[r.roomId]=[{username: r.username, text:r.text}];
		broker.clients.forEach(client => {
			if(client !== ws){
				client.send(JSON.stringify(r));
			}
		})
	  });
})

app.route('/chat')
.get((req, res, next) => {
	var result=[];
	for(var i=0;i<chatrooms.length;i++){
		var r=new Room(chatrooms[i].id,chatrooms[i].name,chatrooms[i].image);
		r.messages=messages[chatrooms[i].id];
		result.push(r);
	}
    res.send(JSON.stringify(result));
})
.post((req, res, next) => {
	if(req.body.name){
		var r=new Room(chatrooms.length.toString(),req.body.name,req.body.image);
		messages[chatrooms.length]=[];
		chatrooms.push(r);
		res.status(200).send(JSON.stringify(r));
	}
	else{
		res.status(400).send("no name field");
	}
})

cpen322.connect('http://99.79.42.146/cpen322/test-a3-server.js');
cpen322.export(__filename, { app,chatrooms,messages,broker});