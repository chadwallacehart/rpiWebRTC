const express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server);


let webrtcRunning = false;

// Routing
app.use(express.static(__dirname + '/public'));

//added for CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app
    //Load Chromium to send the WebRTC stream and view it
    .get('/', (req, res) => {
        if (webrtcRunning === false) {
            loadWebRTC();
        }
        res.sendFile(__dirname + '/public/html/webrtc-receiver.html');

    })

    //Send the WebRTC stream
    .get('/webrtc-send', function (req, res, next) {
        res.sendFile(__dirname + '/public/html/webrtc-sender.html');
    })

    //view the WebRTC stream
    .get('/webrtc-view', function (req, res, next) {
        res.sendFile(__dirname + '/public/html/webrtc-receiver.html');
    })
;

//ToDo: setup environment vars
const port = process.env.PORT || 2368;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});


//ToDo: see why I left these in global scope
let senderReady = false;
let receiverReady = false;


//WebSocket logic
io.on('connection', function (socket) {

    console.log("socket connected");
    socket.emit('init', {data: 'Hello socket'});

    socket.on('touchui', function (data) {
        //console.log(data);
        gameControl(data);
    });

    socket.on('webrtc', function (message) {
        console.log(socket.id + ' said: ', message);

        //todo: only allow one sender
        if (message === "sender-ready") {
            senderReady = true;

            if (receiverReady === true) {
                console.log("Starting WebRTC call");
                socket.emit('webrtc', 'startCall');
            }
            else
                console.log("Receiver not ready for WebRTC call");

        }
        else if (message === "receiver-ready") {
            console.log("WebRTC receiver ready");
            receiverReady = true;

            if (senderReady === true) {
                console.log("Starting WebRTC call");
                socket.broadcast.emit('webrtc', 'startCall');
            }
            else
                console.log("Sender not ready for WebRTC call");

        }
        else if (message === "receiver-off") {
            console.log("WebRTC receiver off");
            receiverReady = false;
        }
        else if (message === "sender-off") {
            console.log("WebRTC sender off");
            senderReady = false;
        }
        else
            socket.broadcast.emit('webrtc', message);
    });

});