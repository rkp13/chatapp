var express = require('express');
app = express();
server = require('http').createServer(app);

var mongoose = require('mongoose');
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.connect('mongodb://localhost/empdb');

io = require('socket.io').listen(server);
console.log('server running at 3000...');

usernames = [];
_room = 1;
server.listen(process.env.PORT || 3000);

var User = mongoose.model('User',{name: String, email: String,pass: String});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});
app.get('/second', function(req, res){
    res.sendFile(__dirname + '/second.html');
});
app.post('/second',function(req,res){    
    var name = req.body.name;
    var email = req.body.email;
    var passw = req.body.pass;
    
    var user1 = new User({name: name, email: email, pass: passw});
    console.log(user1);
    user1.save(function(err,userObj){
        if(err)
            console.log(err);
        else
            console.log('Saved Successfully');
    });

    res.sendFile(__dirname+'/second.html');      
});
app.get('/reg',function(req,res){
    res.sendFile(__dirname+'/reg.html');     
});

io.sockets.on('connection', function(socket){

    socket.on('room', function(room){
        socket.leave(_room);
        socket.room = room; 
        _room = room;
        console.log(_room);               
        socket.join(room);
    });

    socket.on('mousemove', function (data) {

        // This line sends the event (broadcasts it)
        // to everyone except the originating client.
        socket.broadcast.emit('moving', data);
    });

    socket.on('new user', function(data, callback){
        if(usernames.indexOf(data) != -1){
            callback(false);
        } else {
            callback(true);
            socket.username = data;
            usernames.push(socket.username);
            updateUsernames();
        }
    });

    socket.on('getroom',function(data){
        io.sockets.emit('updateroom',{room : _room});
    });

    // update usernames
    function updateUsernames(){
        io.sockets.emit('usernames', usernames);
    }

    // Send Message
    socket.on('send message', function(data){        
        io.sockets.emit('new message', {msg: data, user: socket.username,room : _room});
    });

    //check User credentials
    socket.on('checkUser',function(data){
        console.log(data.name+' '+data.password);
        User.find({email: data.name , pass: data.password},function(err,results){
            if(err)
                console.log(err);
            else{
                console.log(results);
                if(results.length>0)
                    io.sockets.emit('validateUser',{ status: true});                
                else
                    io.sockets.emit('validateUser',{ status: false});
            }
        });        

    })

    // Disconnect
    socket.on('disconnect', function(data){
        if(!socket.username) return;
        usernames.splice(usernames.indexOf(socket.username), 1);
        updateUsernames();
    });
});
