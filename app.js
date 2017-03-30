var express = require('express');
var app = express();
var session = require('express-session');
var cookieParser = require('cookie-parser');
var path = require('path');
server = require('http').createServer(app);

var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var dir = path.join(__dirname, 'public');

app.use(express.static(dir));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret: "jbjcbjbdjbjbdc",resave: false,saveUninitialized: true}));
mongoose.connect('mongodb://localhost/empdb');

io = require('socket.io').listen(server);
console.log('server running at 3000...');

usernames = [];
dispname = '';
server.listen(process.env.PORT || 3000);

var User = mongoose.model('User',{name: {type: String, index: { unique: true }}, email: String,pass: String,id: String,roomname: String});
var Room = mongoose.model('Room',{name: {type: String, index: { unique: true }}, id: {type: String, index: { unique: true }}});
var _id = '';

//generate random id
function getRandomId(){
    var chars = 'acdefhiklmnoqrstuvwxyz0123456789'.split('');
    var result = '';
    for(var i=0; i<6; i++){
        var x = Math.floor(Math.random() * chars.length);
        result += chars[x];
    }
    console.log('id output : '+result+' '+String(result));
    return String(result);
}

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var name;
var email;
var passw;
var originalid;
var eid;

app.post('/idinput',function(req,res){
    name = req.body.name;
    email = req.body.email;
    passw = req.body.pass;
    var id = getRandomId();
    _id = id;        
    res.cookie('oname',id);
    var user1 = new User({name: name, email: email, pass: passw, id: _id,roomname: ''});
    console.log(user1);
    user1.save(function(err,userObj){
        if(err)
            console.log(err);
        else
            console.log('Saved Successfully');
    });
    res.sendFile(__dirname + '/idinput.html');
});

app.get('/idinput', function(req, res){
    //res.cookie('oname',originalid);
    res.sendFile(__dirname + '/idinput.html');
});

app.post('/second:room',function(req,res){
    console.log('room value '+req.params.room);
    var roomName = req.params.room;
    roomName = roomName.substring(1);
    var roomid = getRandomId();
    var room1 = new Room({name: roomName,id: roomid});
    console.log(room1);
    room1.save(function(err,userObj){
        if(err)
            console.log(err);
        else
            console.log('Saved Successfully');
    });
    //res.cookie('roomname',roomid);        
    eid = req.body.username;
    console.log('this is actual name '+req.body.actualname);
    console.log('this is username '+req.body.username.length);
    if(req.body.username.length == 0){
        eid = req.body.actualname;
    }
    //res.cookie('name',eid);
    //console.log('eid '+eid);
    res.sendFile(__dirname + '/second.html');      
});

app.get('/second:room',function(req,res){
    /*var roomName = req.params.room;
    roomName = roomName.substring(1);
    Room.find({name: roomName},function(err,results){
        if(err)
            console.log(err);
        else{
            console.log(results);
            if(results.length>0){
                //res.cookie('roomname',results[0].id);
            }
        }
    });*/
    
    res.sendFile(__dirname + '/second.html');      
});

/*app.all('/*',function(req,res){
    name = req.session.name;
    _id = req.session.id; 
    eid = req.session.eid;   
});*/

app.get('/reg',function(req,res){    
    res.sendFile(__dirname+'/reg.html');     
});

app.post('/reg',function(req,res){    
    res.sendFile(__dirname+'/reg.html');     
});

io.sockets.on('connection', function(socket){

    socket.on('mousemove', function (data) {

        // This line sends the event (broadcasts it)
        // to everyone except the originating client.
        socket.broadcast.emit('moving', data);
    });

    socket.on('getname',function(data){
        User.find({id: data.id},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results);
                if(results.length>0){
                    io.sockets.emit('recievename',results[0].name);
                }
            }
        });
    });

    socket.on('new user', function(data, callback){
        User.find({id: data.eid},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results);
                if(results.length>0){
                    User.find({id: data.id},function(err,results){
                        if(err)
                            console.log(err);
                        else{
                            console.log('Name found '+results[0].name);
                            if(results.length>0){
                                tmpname = results[0].name;
                                if(usernames.indexOf(tmpname) != -1){
                                    callback(false);
                                } else {
                                    console.log('this runs');         
                                    socket.username = tmpname;
                                    usernames.push(tmpname);
                                    dispname = tmpname; 
                                    console.log(dispname);
                                    updateUsernames(data.eid);                                         
                                    callback(true);            

                                }
                            }                    
                        }
                    });
                }                                    
            }            
        });                
    });    

    // update usernames
    function updateUsernames(eid){
        console.log('usernames ' +usernames);
        io.sockets.emit('usernames', {usernames:dispname,eid: eid});
    }

    // Send Message
    socket.on('send message', function(data){
        User.find({id: data.id},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results);
                if(results.length>0)
                    io.sockets.emit('new message', {msg: data.msg, user: results[0].name,eid : data.eid});                    
            }
        });        
        
    });    

    //get room id
    socket.on('getroomid',function(data,callback){
        Room.find({name: data.name},function(err,results){
            if(err){
                console.log(err);                
            }
            else{
                console.log('Results of ID fetch '+results);
                if(results.length>0)
                    callback({id: results[0].id});
            }
        });
    });

    //get room name
    socket.on('getroomname',function(data,callback){
        Room.find({id: data.id},function(err,results){
            if(err){
                console.log(err);
                
            }
            else{                
                if(results.length>0){
                    console.log('Results of Name fetch '+results);
                    console.log('Room Name fetched '+results[0].name);
                    callback({status: true,name: results[0].name});
                }
                else
                    callback({status: false});
            }
        });
    });

    socket.on('checkroom',function(data){
        io.sockets.emit('broadcastroom',{eid: data.eid});        
    });  

    //check User credentials
    socket.on('checkUser',function(data,callback){
        console.log(data.name+' '+data.password);   
        var tmpflag;     
        User.find({email: data.name , pass: data.password},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results);
                if(results.length>0){
                    console.log('id from back: '+ results[0].id);
                    name = results[0].name;
                    email = results[0].email;
                    passw = results[0].pass;       
                    originalid = results[0].id;   
                    tmpflag = true;                                                                      
                }
                else{
                    tmpflag =false;                    
                }
                callback({id: originalid});
                io.sockets.emit('validateUser',{ status: tmpflag});
            }

        });
        console.log(tmpflag);
                
         
    });

    function validate(flag,callback){

    }

    // Disconnect
    socket.on('disconnect', function(data){
        if(!socket.username) return;
        usernames.splice(usernames.indexOf(socket.username), 1);
        updateUsernames();
    });
});
