var express = require('express');
var app = express();
var session = require('express-session');
var cookieParser = require('cookie-parser');
server = require('http').createServer(app);

var mongoose = require('mongoose');
var bodyParser = require('body-parser');

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

var User = mongoose.model('User',{name: String, email: String,pass: String,id: String,roomname: String});
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
    res.cookie('oname',originalid);
    res.sendFile(__dirname + '/idinput.html');
});

app.post('/second',function(req,res){
    res.cookie('name',req.body.username);        
    eid = req.body.username;
    console.log('this is actual name '+req.body.actualname);
    console.log('this is username '+req.body.username.length);
    if(req.body.username.length == 0){
        eid = req.body.actualname;
    }
    res.cookie('name',eid);
    console.log('eid '+eid);
    res.sendFile(__dirname + '/second.html');      
});

app.get('/second',function(req,res){    
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

    socket.on('setroomtodb',function(data){
        User.findOneAndUpdate({id: data.id}, {$set:{roomname: data.roomname}}, {new: true}, function(err, doc){
            if(err){
                console.log("Something wrong when updating data!");
            }
            console.log("new data "+doc);
        });
    });

    socket.on('getroomname',function(data){
        User.find({id: data.id},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log("LOOK--->"+results);
                if(results.length>0){
                    io.sockets.emit('updateroomcookie',{roomname: results[0].roomname});
                }
            }
        });
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

    socket.on('checkroom',function(data){
        io.sockets.emit('broadcastroom',{eid: data.eid});        
    });  

    //check User credentials
    socket.on('checkUser',function(data){
        console.log(data.name+' '+data.password);        
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
                    io.sockets.emit('validateUser',{ status: true});                          
                }
                else
                    io.sockets.emit('validateUser',{ status: false});
            }
        });        
    });

    // Disconnect
    socket.on('disconnect', function(data){
        if(!socket.username) return;
        usernames.splice(usernames.indexOf(socket.username), 1);
        updateUsernames();
    });
});
