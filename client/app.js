// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

var id = 4;
var profile={
    username: 'Alice'
};

var Service={
	origin: window.location.origin,
    getLastConversation: function(roomId,before){
        return new Promise((resolve,reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", Service.origin + "/chat/" + roomId + "/messages?before=" + before);
            xhr.onload = function() {
                if (xhr.status==200) {
                    var result = JSON.parse(xhr.responseText) ;
                    resolve(result);
                } else {	
                    reject(new Error(xhr.responseText));
                }
            };		
            xhr.onerror = function(err) {
                    reject(new Error(err));
            };  
            xhr.onabort = function() {
                    reject("Aborted");
            };
            xhr.send();
        });
    },
	getAllRooms: function(){
        return new Promise((resolve,reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", Service.origin + "/chat");
            xhr.onload = function() {
                if (xhr.status==200) {
                    var result = JSON.parse(xhr.responseText) ;
                    resolve(result);
                } else {	
                    reject(new Error(xhr.responseText));
                }
            };		
            xhr.onerror = function(err) {
                    reject(new Error(err));
            };  
            xhr.onabort = function() {
                    reject("Aborted");
            };
            xhr.send();
        });
	},
    addRoom: function(data){
        return new Promise((resolve,reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", Service.origin + "/chat");
            xhr.onload = function() {
                if (xhr.status==200) {
                    var result = JSON.parse(xhr.responseText) ;
                    resolve(result);
                } else {	
                    reject(new Error(xhr.responseText));
                }
            };		
            xhr.onerror = function(err) {
                    reject(new Error(err));
            };  
            xhr.onabort = function() {
                    reject("Aborted");
            };
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.send(JSON.stringify(data));
        });
    },
    getProfile: function(){
        return new Promise((resolve,reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", Service.origin + "/profile");
            xhr.onload = function() {
                if (xhr.status==200) {
                    var result = JSON.parse(xhr.responseText) ;
                    resolve(result);
                } else {	
                    reject(new Error(xhr.responseText));
                }
            };		
            xhr.onerror = function(err) {
                    reject(new Error(err));
            };  
            xhr.onabort = function() {
                    reject("Aborted");
            };
            xhr.send();
        });
    }
}
class LobbyView {
    constructor(lobby) {
      this.lobby = lobby;
      this.elem = createDOM(
        `<div class="content">
        <ul class="room-list">
          <li>
            <a href="#/chat"> </a>
          </li>
          <li>
            <a href="#/chat"> </a>
          </li>
          <li>
            <a href="#/chat"> </a>
          </li>
        </ul>
        <div class="page-control">
          <input type="text" name="roomName" value="Room Name">
          <button type="button">Create New Room</button>
        </div>
      </div>`
      );
    
      this.listElem = this.elem.querySelector("ul.room-list");
      this.inputElem = this.elem.querySelector("input");
      this.buttonElem = this.elem.querySelector("button");
      var that=this;
      this.buttonElem.addEventListener('click', function(){
                                        Service.addRoom({
                                            "name":that.inputElem.value.toString(),
                                            "image": 'assets/everyone-icon.png'
                                        })
                                        .then(
                                            (result) => { 
                                            that.lobby.addRoom(result._id,result.name,result.image,[]);
                                            that.inputElem.value='';
                                            id++; }
                                        )
                                            });
      this.lobby.onNewRoom=function(room){
        var item = document.createElement('li');
        var item2 = document.createElement('a');
        item2.setAttribute('href', '/#/chat/' + room.id);
        item2.innerText = room.name;
        item.appendChild(item2);
        that.listElem.appendChild(item);
      }
      this.redrawList();
    }
    redrawList(){
        emptyDOM(this.listElem);
        for (var key in this.lobby.rooms) {
            var item = document.createElement('li');
            var item2 = document.createElement('a');
            item2.setAttribute('href', '/#/chat/' + this.lobby.rooms[key].id);
            item2.innerText = this.lobby.rooms[key].name;
            item.appendChild(item2);
            this.listElem.appendChild(item);
        }
    }
}

class ChatView {
    constructor(socket) {
      this.socket=socket;
      this.elem = createDOM(
        `<div class="content">
        <h4 class="room-name"> </h4>
        <div class="message-list">
            <div class="message">
                <span class="message-user"></span>
                <span class="message-text"></span>
            </div>
            <div class="message my-message">
                <span class="message-user"></span>
                <span class="message-text"></span>
            </div>
        </div>
        <div class="page-control">
            <textarea>Message </textarea>
            <button type="button">Send</button>
        </div>
    </div>`
    );
    this.titleElem = this.elem.querySelector("h4.room-name");
    this.chatElem = this.elem.querySelector("div.message-list");
    this.inputElem = this.elem.querySelector("textarea");
    this.buttonElem = this.elem.querySelector("button");
    this.room=null;
    var that = this;
    this.buttonElem.addEventListener('click',function(){
        that.sendMessage();
    });
    this.inputElem.addEventListener('keyup',function(event){
        if(!event.shiftKey && event.key === 'Enter'){
            that.sendMessage();
        }
    })
    this.chatElem.addEventListener('wheel',function(event){
        if(that.room.canLoadConversation && event.deltaY < 0 && that.chatElem.scrollTop==0){
            that.room.getLastConversation.next();
        }
    })
    }
    sendMessage(){
        var value=this.inputElem.value;
        this.room.addMessage(profile.username,value);
        var that=this;
        this.socket.send(JSON.stringify({
            roomId:that.room.id,
            username:profile.username,
            text:value
        }));
        this.inputElem.value = "";
    }
    setRoom(room){
        this.room=room;
        this.titleElem.innerText=this.room.name;
        emptyDOM(this.chatElem);
        for(var i=0;i<this.room.messages.length;i++){
            var div = document.createElement('div');
            var span = document.createElement('span');
            var span2 = document.createElement('span');
            span.className='message-user';
            span2.className='message-text';
            span.innerText=this.room.messages[i].username;
            span2.innerText=this.room.messages[i].text;
            if(this.room.messages[i].username===profile.username){
                div.className='message my-message';
            }
            else{
                div.className='message';
            }
            div.appendChild(span);
            div.appendChild(span2);
            this.chatElem.appendChild(div);
        }
        var that=this;
        this.room.onNewMessage=function(message){
            var div = document.createElement('div');
            var span = document.createElement('span');
            var span2 = document.createElement('span');
            span.className='message-user';
            span2.className='message-text';
            span.textContent=message.username;
            span2.textContent=message.text;
            if(message.username===profile.username){
                div.className='message my-message';
            }
            else{
                div.className='message';
            }
            div.appendChild(span);
            div.appendChild(span2);
            that.chatElem.appendChild(div);
        }
        this.room.onFetchConversation=function(conversation){
            var hb = that.chatElem.scrollHeight;
            for (var i=conversation.messages.length - 1; i>=0; i--) {
                var div = document.createElement('div');
                var span = document.createElement('span');
                var span2 = document.createElement('span');
                span.className='message-user';
                span2.className='message-text';
                span.textContent=conversation.messages[i].username;
                span2.textContent=conversation.messages[i].text;
                if(conversation.messages[i].username===profile.username){
                    div.className='message my-message';
                }
                else{
                    div.className='message';
                }
                div.appendChild(span);
                div.appendChild(span2);
                that.chatElem.insertBefore(div,that.chatElem.firstChild);
            }
            var ha = that.chatElem.scrollHeight;
            that.chatElem.scrollTop = ha - hb;
        }
    }
}

class ProfileView {
    constructor() {
      this.elem = createDOM(
        `<div class="content">
        <div class="profile-form">
            <div class="form-field">
                <label>Name</label>
                <input type="text">
            </div>
            <div class="form-field">
                <label>Password</label>
                <input type="text">
            </div>
            <div class="form-field">
                <label>File</label>
                <input type="file"> <br> <br>
            </div>
        </div>
        <div class="page-control">
            <button type="button">Save</button> <br> <br>
        </div>
    </div>`
      );
    }
}

function* makeConversationLoader(room) {
    var time= room.timestamp;
    while (room.canLoadConversation) {
        room.canLoadConversation = false; 
        yield new Promise((resolve, reject) => {
            Service.getLastConversation(room.id,time).then(result =>{  
                if(result === null) {  
                    room.canLoadConversation = false;             
                    resolve(null);
                } else {                            
                    time=result.timestamp;
                    room.canLoadConversation = true;
                    room.addConversation(result);     
                    resolve(result);
                }
            });
        });
    }
}
class Room {
    constructor(id, name, image='assets/everyone-icon.png', messages=[]) {
      this.id = id;
      this.name = name;
      this.image = image;
      this.messages = messages;
      this.timestamp = Date.now();
      this.canLoadConversation=true;
      this.getLastConversation=makeConversationLoader(this);
    }
    addMessage(username, text){
        if(text==='') return;
        if(text && !text.trim()) return;
        function message(username,text) {
            this.username = username;
            this.text = text;
        };
        this.messages.push(new message(username,text));
        if(this.onNewMessage !== undefined){
            this.onNewMessage(this.messages[this.messages.length-1]);
        }
    }
    addConversation(conversation){     
        for(var i=0; i<conversation.messages.length; i++) {
            this.messages.push(conversation.messages[i]); 
        }
        if(this.onFetchConversation) {
            this.onFetchConversation(conversation);
        }
    }
}

class Lobby {
    constructor() {
      this.rooms = {};
    }
    getRoom(roomId){
        for (var key in this.rooms) {
            if(key==roomId){
                return this.rooms[key];
            };
        }
        return null;
    }
    addRoom(id, name, image, messages){
        this.rooms[id]=new Room(id,name,image,messages);
        if(this.onNewRoom !== undefined){
            this.onNewRoom(this.rooms[id]);
        }
    }
}

function main() {
    this.socket = new WebSocket('ws://localhost:8000');
    this.lobby=new Lobby();
    this.lobbyView = new LobbyView(this.lobby);
    this.chatView = new ChatView(this.socket);
    this.profileView = new ProfileView();
    Service.getProfile().then((result)=>{
        profile=result;
    })
    this.renderRoute=function() {
        if(window.location.hash=='#/'){
            emptyDOM(document.getElementById("page-view"));
            document.getElementById("page-view").appendChild(this.lobbyView.elem);
        }
        else if(window.location.hash.includes('#/chat')){
            emptyDOM(document.getElementById("page-view"));
            document.getElementById("page-view").appendChild(this.chatView.elem);
            var curRoom = this.lobby.getRoom(window.location.hash.split('/')[2]);
            if (curRoom !== null) {
                this.chatView.setRoom(curRoom);
            }
        }
        else if(window.location.hash.includes('#/profile')){
            emptyDOM(document.getElementById("page-view"));
            document.getElementById("page-view").appendChild(this.profileView.elem);
        }
    }
    this.refreshLobby=function(){
        Service.getAllRooms().then(
            (result)=>{
                for(var i=0;i<result.length;i++){
                    if(result[i]._id in this.lobby.rooms){
                        this.lobby.rooms[result[i]._id].name=result[i].name;
                        this.lobby.rooms[result[i]._id].image=result[i].image;
                    }
                    else{
                        this.lobby.addRoom(result[i]._id,result[i].name,result[i].image,result[i].messages);
                    }
                }
            }
        )
    }
    renderRoute();
    refreshLobby();
    var interval = setInterval(refreshLobby, 6000);
    window.addEventListener("popstate", renderRoute);
    var that=this;
    socket.addEventListener('message', function (event) {
        var r=JSON.parse(event.data);
        var room=that.lobby.getRoom(r.roomId);
        room.addMessage(r.username,r.text);
    });
    cpen322.export(arguments.callee, { renderRoute,lobbyView,chatView,profileView,lobby,refreshLobby,socket});
}

window.addEventListener("load", main);