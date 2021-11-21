const path = require('path');
const fs = require('fs');
const ws = require('ws');
const cpen322 = require('./cpen322-tester.js');
const Database = require('./Database');
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


//var chatrooms=[];
var messages={};
var messageBlockSize = 10;
var db = new Database('mongodb://localhost:27017','cpen322-messenger');
db.getRooms().then((result) => {
	result.forEach(
		function (chatroom){
		messages[chatroom._id] = [];
	})
})
// var Room = function(id, name, image='assets/everyone-icon.png'){
//     this.id = id;
//     this.name = name;
//     this.image = image;
// }
var Conversation = function(room_id, timestamp, messages){
    this.room_id=room_id;
    this.timestamp=timestamp;
    this.messages=messages;
}
var broker=new ws.Server({ port: 8000 });

// chatrooms.push(new Room(chatrooms.length.toString(),"CPEN"));
// chatrooms.push(new Room(chatrooms.length.toString(),"CPSC"));
// messages[chatrooms[0].id]=[];
// messages[chatrooms[1].id]=[];
broker.on("connection", function(ws){
	ws.on('message', function message(data) {
		var r=JSON.parse(data);
		if(r.roomId in messages)
			messages[r.roomId].push({username: r.username, text:r.text});
		else
			messages[r.roomId]=[{username: r.username, text:r.text}];
		if(messages[r.roomId].length==messageBlockSize){
			var conversation=new Conversation(r.roomId,Date.now(),messages[r.roomId]);
			db.addConversation(conversation);
			messages[r.roomId]=[];
		}
		broker.clients.forEach(client => {
			if(client !== ws){
				client.send(JSON.stringify(r));
			}
		})
	  });
})

app.route('/chat/:room_id')
.get((req, res, next) => {
	db.getRoom(req.params['room_id']).then((result) => {
		if(result != null) res.send(JSON.stringify(result));
		else res.status(404).send("Room X was not found");
	})
})

app.route('/chat/:room_id/messages')
.get((req, res, next) => {
	db.getLastConversation(req.params['room_id'],req.query.before).then((result)=>{
		if(result != null) res.send(JSON.stringify(result));
		else res.status(404).send("Conversation was not found");
	})
})

app.route('/chat')
.get((req, res, next) => {
	db.getRooms().then((result) => {
		result.forEach(
			function (chatroom){
			chatroom.messages=messages[chatroom._id];
		})
		res.send(JSON.stringify(result));
	})
})
.post((req, res, next) => {
	if(req.body.name){
		db.addRoom(req.body).then((result) => {
			messages[result._id]=[];
			res.status(200).send(JSON.stringify(result));
		});
	}
	else{
		res.status(400).send("no name field");
	}
})

cpen322.connect('http://99.79.42.146/cpen322/test-a4-server.js');
cpen322.export(__filename, { app,messages,broker,db,messageBlockSize});