'use strict'
let app = require('http').createServer(handler);
let io = require('socket.io')(app);
let fs = require('fs');

app.listen(8080);

let USERS = [];
let REGISTERED_USERS = [
    {
        username : 'bmacdonald',
        password : 'imabutt',
        userID : 666
    },
]

let SERVER_MESSAGES = {
    busy : "Server busy. Please try again later."
}

//Singleton
let PlayerManager = (function(){ 
    let instance;
    let playerList = [];

    let init = function(){
        return {}
    }

    let update = function(data){

    }

    let move = function(userID, x, y){

        

        function playerFind(playerList){
            return playerList.userID == userID
        }

        let p = playerList.find(playerFind);

        if(p != null){
            p.position.x += x * p.stats.movespeed;
            p.position.y += y * p.stats.movespeed;
            console.log( "x: " + p.position.x );
            console.log( "y: " + p.position.y );
        }

        //find player in list and replace?
    }

    let addNewPlayer = function(playerInfo){

        let p = new Player(
            10,
            10,
            playerInfo.userID, //movement hooks off of this
            playerInfo.playerName, 
            playerInfo.playerClass, 
            playerInfo.playerRace
        );

        this.playerList.push(p);
    }

    if(!instance){
        instance = init(); 
    }
    //Public Members
    return {
        move,
        playerList,
        addNewPlayer
    }
})();

let Player = function(x,y,userID,playerName,playerClass,playerRace){
    this.userID = userID;
    this.name = playerName;
    this.class = playerClass;
    this.race = playerRace;
    this.position = {
        'x': x,
        'y': y
    };
    this.stats = {
        movespeed : 1,
        health : 10,
        mana : 1,
        dph : 1,
        aoe : 0
    }
}

Player.prototype.init = function(){
    this.position = {
        'x' : 10,
        'y' : 10
    }
    USERS.push(this);
}

io.on('connection', function(socket){

    let username = 'Anon' + (""+Math.random()).substring(2,7);
    
    //Add user to connected users list
    USERS.push({
        socketid : socket.id,
        username : username
    });

    
    io.emit('newuser',{
        username : username,
        userlist : USERS
    });
    socket.emit('successfulconnection', {
        username : username,
        userlist : USERS,
    });

    socket.emit('update', {
        playerlist : PlayerManager.playerList,
        playercount : PlayerManager.playerList.length
    });
    
    socket.on('login', function(msg){
        //Check username against registered users

        function userLogin(userLogin){
            console.log(userLogin)
            console.log(msg)
            return userLogin.username == msg.username;
        };

        var user = REGISTERED_USERS.find(userLogin);

        if(user != null ){
            if(user.password == msg.password){
                //pass unique id
                socket.emit('loginsuccessful',{
                    userID : user.userID
                });        
            }
        }

    });
    socket.on('chatmessage', function(msg){
        io.emit('globalmessage', {
            user: msg.user,
            message: msg.message
        });
    });

    socket.on('playerCreate', function(data){
        //Add Player to Player List
        if(PlayerManager){
            PlayerManager.addNewPlayer({
                userID : data.userID,
                playerName : data.playerName,
                playerClass : data.playerClass,
                playerRace : data.playerRace
            });
            console.log(PlayerManager.playerList);
        }else{
            io.emit('globalmessage', {
                message: SERVER_MESSAGES.busy
            });
        }
    });

    //User Movement
    socket.on('move', function(data){

        console.log('user moved ' + data.userID);
        //Do something with data - need a complex array or something and player object/class
        PlayerManager.move(data.userID, data.x, data.y);
        socket.emit('update', {
            playerlist : PlayerManager.playerList
        });
    });
    
    socket.on('usernamechange', function(msg){

        for (var x = 0; x < USERS.length; x++){

            if(USERS[x].socketid == socket.id){

                if(USERS[x].username == msg.newusername){
                    socket.emit('usernameerror','This is already your username!');
                    return;
                }else if (USERS[x].username != msg.newusername) {
                for (var y = 0; y < USERS.length; y++){
                    if(USERS[y].username == msg.newusername){
                        socket.emit('usernameerror','Username Already Exists!');
                        return;
                    }
                } 
            }

            USERS[x].username = msg.newusername;
            io.emit('usernamechange', {
                message : 'User ' + msg.oldusername + ' changed their name to ' + msg.newusername + "<br>", newusername: msg.newusername,
                userlist : USERS
            });
        }
    }});

    socket.on('disconnect', function(){

        for (var x = 0; x < USERS.length; x++){
            if (USERS[x].socketid == socket.id){

                let user = USERS[x].username

                USERS.splice(x,1);
                
                io.emit('userdisconnect', {
                    message : 'User ' + user + " disconnected",
                    userlist : USERS
                });
                
            }
        }
    });
    
    console.log('User Connected'); 
});

function handler(req,res){
    fs.readFile(__dirname + '/index.html',function(err, data){
        if(err){
            res.writeHead(500);
            return res.send('Error loading index.html');
        }
        res.writeHead(200);
        res.end(data);
    });
    
}

//debugging


