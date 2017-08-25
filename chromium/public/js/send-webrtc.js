/**
 * Created by chad on 4/1/17.
 */

'use strict';

const socket = io(); //.connect();

//////////////////////////
/*** Get local media ***/
let videoReady = false;
const localVideo = document.querySelector('#localVideo');

let guMconstraints = {
    audio: true,
    video: {
        width: {ideal: 640},    //new syntax
        height: {ideal: 360}   //new syntax
    }
};

navigator.mediaDevices.getUserMedia(guMconstraints)
    .then(gotStream)
    .catch(function (e) {
        console.error('getUserMedia() error: ' + e.name);
    });

function gotStream(stream) {
    let videoTracks = stream.getVideoTracks();
    console.log('Using video device: ' + videoTracks[0].label);
    let audioTracks = stream.getAudioTracks();
    console.log('Using audio device: ' + audioTracks[0].label);

    stream.oninactive = function () {
        console.log('Stream inactive');
    };
    //localVideo.src = window.URL.createObjectURL(stream); //Deprecated
    localVideo.srcObject = stream;
    socket.emit('webrtc', 'sender-ready');
    videoReady = true;
}

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
    console.log("Webrtc message: " + JSON.stringify(message));
    if (message === 'startCall')
        startCall();
    else if (message.type === 'candidate') {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    }
    else if (message.type === 'offer') {
        pc.setRemoteDescription(new RTCSessionDescription(message))
            .then(() => console.log("setRemoteDescription complete"),
                (err) => console.error("Failed to setRemoteDescription: " + err));

        pc.createAnswer().then(
            (desc) => {
                pc.setLocalDescription(desc)
                    .then(() => console.log("setLocalDescription complete"),
                        (err) => console.error("setLocalDesription error:" + err));
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


function startCall() {

    //Setup our peerConnection object
    try {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        //pc.onaddstream = handleRemoteStreamAdded;
        //pc.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }

    //Attach the local stream & create an offer to the remote peer
    pc.addStream(localVideo.srcObject);
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);

    //shutdown the peerConnection when the page is closed
    window.onbeforeunload = () => {
        socket.emit('webrtc', 'sender-off');
        pc.close();
        pc = null;
    };

}

function handleIceCandidate(event) {
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
}


function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    socket.emit('webrtc', sessionDescription);
}

function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}

function onCreateSessionDescriptionError(error) {
    console.error('Failed to create session description: ' + error.toString());
}
