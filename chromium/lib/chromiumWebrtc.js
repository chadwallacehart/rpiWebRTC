/**
 * Created by chad on 4/8/17.
 */

const spawn = require('child_process').spawn;

function loadWebrtc() {
    const sh = spawn('sh', ['webrtc.sh'], {
        //cwd: process.cwd(),
        //ToDo: fix static path reference
        env: Object.assign({}, process.env, {PATH: process.env.PATH + ':/usr/local/bin'})
    });

    sh.stdout.on('data', (data) => {
        console.log(`chromium-browser: ${data}`);
        webrtcRunning = true;
    });

    sh.stderr.on('data', (data) => {
        console.log(`chromium-browser: ${data}`);
        //res.end('Error starting WebRTC Script ' + data);
    });

    sh.on('close', (code) => {
        webrtcRunning = false;
        console.log(`child process exited with code ${code}`);
    });

    sh.on('error', (error) => {
        webrtcRunning = false;
        console.log(`Error launching chromium-browser: ` + error);
        res.end('Error starting WebRTC Script ' + error);
    });
}

module.exports = loadWebrtc;