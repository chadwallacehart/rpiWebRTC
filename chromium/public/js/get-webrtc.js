/**
 * Created by chad on 4/1/17.
 */

'use strict';

const socket= io(); //.connect();
let webrtcActive = false;

//////////////////////////
/*** Peer Connection ***/
let pc;
const pcConfig = {
    'iceServers': [{
        'url': 'stun:stun.l.google.com:19302'
    }]
};


//Routing backed on the message content
socket.on('webrtc', (message) => {
    webrtcActive = true;

    if (message.type === 'candidate') {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate)
            .then(()=>console.log("Added ICE candidate"),
                (err)=>console.log("Error adding canddidate"));
    }
    else if (message.type === 'offer') {
        pc.setRemoteDescription(new RTCSessionDescription(message))
            .then(() => console.log("setRemoteDescription complete"),
                (err)=>console.error("Failed to setRemoteDescription: " + err));

        pc.createAnswer().then(
            (desc) => {
                pc.setLocalDescription(desc)
                    .then(()=>console.log("setLocalDescription complete"),
                        (err)=>console.error("setLocalDesription error:" + err));
                socket.emit('webrtc', desc);
                console.log("Sending local SDP: " + JSON.stringify(desc));
            },
            (error) =>
                console.log('Failed to create session description: ' + error.toString())
        )
    } else if (message.type === 'answer') {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    }
});

//Setup our peerConnection object
pc = new RTCPeerConnection(pcConfig);

pc.onicecandidate = (event) => {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        socket.emit('webrtc', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
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

//////////////////////////
/*** video handling ***/

window.onload = () => {

    const remoteVideo = document.querySelector('#remoteVideo');

    remoteVideo.addEventListener('loadedmetadata', function() {
        console.log('Remote video videoWidth: ' + this.videoWidth +
            'px,  videoHeight: ' + this.videoHeight + 'px');
    });


    remoteVideo.onresize = function() {
        console.log('Remote video size changed to ' +
            remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight);
    };

    socket.emit('webrtc', 'receiver-ready');

    //Try to connect again if sender is not ready
    setTimeout(()=>{
        if(webrtcActive === false)
            socket.emit('webrtc', 'receiver-ready');
    }, 500);

};



//shutdown the peerConnection when the page is closed
window.onbeforeunload = () => {
    socket.emit('webrtc', 'receiver-off');
    pc.close();
    pc = null;
};
