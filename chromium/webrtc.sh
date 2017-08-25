#!/bin/bash
sudo modprobe bcm2835-v4l2 gst_v4l2src_is_broken=1
sudo --user=pi DISPLAY=:0 chromium-browser --allow-running-insecure-content --ignore-certificate-errors --ignore-urlfetcher-cert-requests  --disable-gpu --no-sandbox --app=https://localhost/webrtc-send
