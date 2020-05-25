 'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/public/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });


var users = {};

wss.on('connection', (connection) => {
  console.log('Client connected');
  connection.on("message",function(message){
        var data ;

        try{
            data = JSON.parse(message);
        }catch(e){
            console.log("Error parsing JSON");
            data = {};
        }

        switch(data.type){
            case "login":
                console.log("User logged in as",data.name);
                if(users[data.name]){
                    sendTo(connection,{
                        type:"login",
                        success:false
                    });
                }else{
                    users[data.name] = connection;
                    connection.name = data.name;
                    sendTo(connection,{
                        type:"login",
                        seccess:true
                    });
                }
                break;
            case "offer":
                console.log("Sending offer to",data.name);
                var conn = users[data.name];

                if(conn != null){
                    connection.otherName = data.name;
                    sendTo(conn,{
                        type:"offer",
                        offer:data.offer,
                        name:connection.name
                    });
                }
                break;
            case "answer":
                console.log("Sending answer to :",data.name);

                var conn = users[data.name];

                if(conn != null){
                    connection.otherName = data.name;
                    sendTo(conn,{
                        type:"answer",
                        answer:data.answer
                    });
                }
                break;
            case "candidate":
                console.log("Sending candidate to", data.name);
                var conn = users[data.name];

                if(conn != null){
                    sendTo(conn,{
                        type:"candidate",
                        candidate:data.candidate
                    });
                }

                break;
            case "leave":
                console.log("Disconnecting user from", data.name);
                var conn = users[data.name];
                conn.otherName = null;

                if(conn != null){
                    sendTo(conn,{
                        type:"leave"
                    });
                }

                break;
            default:
                sendTo(connection,{
                    type:"error",
                    message: "Unrecognized command:" + data.type
                });
                
                break;
        }
    });
  connection.on('close', () => {
		if(connection.name){
            delete users[connection.name];

            if(connection.otherName){
                console.log("Disconnection user from",connection.otherName);
                var conn = users[connection.otherName];
                conn.otherName = null;

                if(conn != null){
                    sendTo(conn,{
                        type: "leave"
                    });
                }
            }
        }
  });
});

function sendTo(conn,message){
    conn.send(JSON.stringify(message));
}

wss.on('listening',function(){
    console.log("Server started ....");
})
