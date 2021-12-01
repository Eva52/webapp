const { MongoClient, ObjectID } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v3.6+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.6/api/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
	this.connected = new Promise((resolve, reject) => {
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			(err, client) => {
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
	this.status = () => this.connected.then(
		db => ({ error: null, url: mongoUrl, db: dbName }),
		err => ({ error: err })
	);
}

Database.prototype.getRooms = function(){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
            db.collection('chatrooms').find().toArray((err, result) => {
                if(err) return err;
				else resolve(result);
			});
		})
	)
}

Database.prototype.getRoom = function(room_id){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if(ObjectID.isValid(room_id)){
                db.collection('chatrooms').findOne({"_id": ObjectID(room_id)}).then((result) => {
                    resolve(result);
                });
            }
            else if(typeof(room_id)==="string"){
                db.collection('chatrooms').findOne({"_id":room_id}).then((result) => {
                    resolve(result);
                })
            }
            else{
                resolve(null);
            }
		})
	)
}

Database.prototype.addRoom = function(room){
	return this.connected.then(db => 
		new Promise((resolve, reject) => {
			if(room.name){
                try {
                    db.collection('chatrooms').insertOne(room).then((result) => {
                        room._id=result.insertedId;
                    })
                }
                catch (e) {
                    throw (e);
                }
                resolve(room);
            }
            else{
                reject(new Error("Invalid Room"));
            }
		})
	)
}

Database.prototype.getLastConversation = function(room_id, before){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if(!before){
                before=Date.now();
            }
            db.collection('conversations').find({"room_id":room_id}).toArray((err, result) => {
                if(err){
                    return err;
                }
				else{
                    var min=before;
                    var conversation = null;
                    result.forEach(element => {
                        if(before-element.timestamp<min && before-element.timestamp>0){
                            min=before-element.timestamp;
                            conversation=element;
                        }
                    });
                    resolve(conversation);
                }
			});
		})
	)
}

Database.prototype.addConversation = function(conversation){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
			if(conversation.room_id && conversation.timestamp && conversation.messages){
                try {
                    db.collection('conversations').insertOne(conversation).then((result) => {
                        conversation._id=result.insertedId;
                    })
                }
                catch (e) {
                    throw (e);
                }
                resolve(conversation);
            }
            else{
                reject(new Error("Invalid Messages"));
            }
		})
	)
}

Database.prototype.getUser = function(username){
	return this.connected.then(db =>
		new Promise((resolve, reject) => {
            db.collection('users').findOne({"username":username}).then((result)=>{
                resolve(result);
            });
		})
	)
}
module.exports = Database;