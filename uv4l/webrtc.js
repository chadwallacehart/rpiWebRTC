/**
 * Created by chad on 8/24/17.
 */
//let signalling_server_address = location.hostname + ':' + (location.port || 443);
let signalling_server_address = "n5r8.local";
let protocol = location.protocol === "https:" ? "wss:" : "ws:";
let ws = new WebSocket(protocol + '//' + signalling_server_address + '/stream/webrtc');

const remoteVideo = document.querySelector('#remoteVideo');

let pc; //make peerConnection object global

//////////////////////////
/*** Peer Connection ***/

function startPeerConnection() {
    const pcConfig = {
        'iceServers': [{
            'url': 'stun:stun.l.google.com:19302'
        }]
    };

//Setup our peerConnection object
    pc = new RTCPeerConnection(pcConfig);

    pc.onicecandidate = (event) => {
        console.log('icecandidate event: ', event);
        if (event.candidate) {
            let candidate = {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                candidate: event.candidate.candidate

                //My format
                /*
                 label: event.candidate.sdpMLineIndex,
                 id: event.candidate.sdpMid,
                 candidate: event.candidate.candidate
                 */
            };

            let req = {
                what: "addIceCandidate",
                data: JSON.stringify(candidate)
            };

            ws.send(JSON.stringify(req));

        } else {
            console.log('End of candidates.');
        }
    };

    pc.onaddstream = (event) => {
        console.log('Remote stream added.');
        remoteVideo.srcObject = event.stream;
        window.stream = event.stream;
    };

    pc.onremovestream = (event) => console.log('Remote stream removed. Event: ', event);

    console.log('Created RTCPeerConnnection');

}
//ICE Candidate handleing
//ToDo: Ask why no trickle??
function onIceCandidates(canidates) {
    for (candidate in canidates)
        console.log("Remote ICE candidate: " + candidate);
    let candidate = new RTCIceCandidate({
        sdpMLineIndex: candidate.sdpMLineIndex, //no label
        candidate: message.candidate
    });

    pc.addIceCandidate(candidate)
        .then(() => console.log("Added ICE candidate"),
            (err) => console.log("Error adding canddidate"));
}

function onOffer(remoteSdp) {
    pc.setRemoteDescription(new RTCSessionDescription(remoteSdp))
        .then(() => console.log("setRemoteDescription complete"),
            (err) => console.error("Failed to setRemoteDescription: " + err));

    pc.createAnswer().then(
        (localSdp) => {
            pc.setLocalDescription(localSdp)
                .then(() => console.log("setLocalDescription complete"),
                    (err) => console.error("setLocalDesription error:" + err));

            let req = {
                what: "answer",
                data: JSON.stringify(localSdp)
            };
            ws.send(JSON.stringify(req));
            console.log("Sending local SDP: " + JSON.stringify(localSdp));
        },
        (error) =>
            console.log('Failed to create session description: ' + error.toString())
    );

    console.log("telling uv4l-server to generate IceCandidates");
    ws.send(JSON.stringify({what: "generateIceCandidates"}));

}

function onAnswer(desc) {
    pc.setRemoteDescription(new RTCSessionDescription(desc));
}


/////////////////////////////
/*** Handle WebSocket messages ***/

ws.onopen = function () {
    console.log("websocket open");

    let req = {
        what: "call",
        options: {
            force_hw_vcodec: true //,
            //vformat: 105
        }
    };
    ws.send(JSON.stringify(req));
    console.log("Initiating call request" + JSON.stringify(req));

};

/*** Signaling logic ***/
ws.onmessage = (event) => {
    let message = JSON.parse(event.data);
    console.log("message=" + JSON.stringify(message));
    //console.log("type=" + msg.type);

    if (message.what === 'undefined') {
        console.error("No websocket message");
        return;
    }

    switch (message.what) {
        case "offer":
            onOffer(JSON.parse(message.data));
            break;

        //ToDo: do I need this?
        case "answer":
            onAnswer(message);
            break;

        case "message":
            console.log("WebSocket Message: " + message.toString());
            break;

        case "geticecandidate":
            onIceCandidates(message);
            break;
    }
};

ws.onerror = (error) => {
    console.error("Websocket error: " + error.toString());
};


////////////////////////////////
/*** General control logic ***/


//Close & clean-up everything
function stop() {

    remoteVideo.src = '';
    if (pc) {
        pc.close();
        pc = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
}


//Exit gracefully
window.onbeforeunload = function () {
    if (ws) {
        ws.onclose = function () {
        }; // disable onclose handler first
        stop();
    }
};

//////////////////////////
/*** video handling ***/

window.onload = () => {



    remoteVideo.addEventListener('loadedmetadata', function () {
        console.log('Remote video videoWidth: ' + this.videoWidth +
            'px,  videoHeight: ' + this.videoHeight + 'px');
    });


    remoteVideo.onresize = function () {
        console.log('Remote video size changed to ' +
            remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight);
    };

    startPeerConnection()

};