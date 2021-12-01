const path = require('path');
const fs = require('fs');
const ws = require('ws');
const cpen322 = require('./cpen322-tester.js');
const Database = require('./Database');
const SessionManager = require('./SessionManager');
const crypto = require('crypto');
const express = require('express');
const e = require('express');

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
var sessionManager = new SessionManager();

app.use('/index.html', sessionManager.middleware, express.static(clientApp + '/index.html'));
app.use('/index', sessionManager.middleware, express.static(clientApp + '/index.html'));
app.use('/app.js', sessionManager.middleware, express.static(clientApp + '/app.js'));
app.use('/+', sessionManager.middleware, express.static(clientApp + '/index.html'));
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
var isCorrectPassword = function(password, saltedHash){
	var hash = crypto.createHash('sha256')
	           .update(password+saltedHash.substring(0,20))
               .digest('base64');
	if(hash==saltedHash.substring(20)){
		return true;
	}
	return false;
}
function sanitize(string) {
	const prevent = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
	};
	return string.replace(/[&<>"']/g, function(match){
		match=prevent[match];
	});
}
broker.on("connection", function(ws,request){
	if(!request.headers.cookie){
		ws.close();
		return;
	}
	let cookie = request.headers.cookie.split(";").reduce((acc,line)=>{
		let eq = line.indexOf("=");
		acc[line.substring(0, eq)] = line.substring(eq + 1);
		return acc
	}
	, {});
	if(!sessionManager.getUsername(cookie['cpen322-session'])){ 
		ws.close();
		return;
	}
	ws.on('message', function message(data) {
		var r=JSON.parse(data);
		if(r.roomId in messages)
			messages[r.roomId].push({username: sessionManager.getUsername(cookie['cpen322-session']), text:sanitize(r.text)});
		else
			messages[r.roomId]=[{username: sessionManager.getUsername(cookie['cpen322-session']), text:sanitize(r.text)}];
		if(messages[r.roomId].length==messageBlockSize){
			var conversation=new Conversation(r.roomId,Date.now(),messages[r.roomId]);
			db.addConversation(conversation);
			messages[r.roomId]=[];
		}
		broker.clients.forEach(client => {
			if(client !== ws){
				client.send(JSON.stringify({username: sessionManager.getUsername(cookie['cpen322-session']), text:sanitize(r.text)}));
			}
		})
	  });
})

app.route('/chat/:room_id')
.get(sessionManager.middleware,(req, res, next) => {
	db.getRoom(req.params['room_id']).then((result) => {
		if(result != null) res.send(JSON.stringify(result));
		else res.status(404).send("Room X was not found");
	})
})

app.route('/chat/:room_id/messages')
.get(sessionManager.middleware,(req, res, next) => {
	db.getLastConversation(req.params['room_id'],req.query.before).then((result)=>{
		if(result != null) res.send(JSON.stringify(result));
		else res.status(404).send("Conversation was not found");
	})
})

app.route('/chat')
.get(sessionManager.middleware,(req, res, next) => {
	db.getRooms().then((result) => {
		result.forEach(
			function (chatroom){
			chatroom.messages=messages[chatroom._id];
		})
		res.send(JSON.stringify(result));
	})
})
.post(sessionManager.middleware,(req, res, next) => {
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

app.route('/login')
.post((req, res, next) => {
	db.getUser(req.body.username).then((result) => {
		if(result==null){
			res.redirect('/login');
		}
		else{
			if(isCorrectPassword(req.body.password,result.password)){
				sessionManager.createSession(res,req.body.username);
				res.redirect('/');
			}
			else{
				res.redirect('/login');
			}
		}
	})
})

app.route('/logout')
.get((req, res, next) => {
	sessionManager.deleteSession(req);
	res.redirect('/login');
})

app.route('/profile')
.get(sessionManager.middleware,(req, res, next) => {
	result={username:req.username};
	res.send(JSON.stringify(result));
})

app.use(function (err, req, res, next) {
	if(err instanceof SessionManager.Error){
		if(req.headers.accept=='application/json'){
			res.status(401).send('Something broke!');
		}
		else{
			res.redirect('/login');
		}
	}
	else{
		res.status(500).send('Something broke!');
	}
  })

cpen322.connect('http://99.79.42.146/cpen322/test-a5-server.js');
cpen322.export(__filename, { app,messages,broker,db,messageBlockSize,sessionManager,isCorrectPassword});