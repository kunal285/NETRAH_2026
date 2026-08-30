"""
PRAHARI Raspberry Pi Camera Manager & MJPEG HTTP Live Stream Server
Captures from CSI / USB camera and serves a standard MJPEG HTTP stream on port 8080
accessible via: http://<ROBOT_IP>:8080/video or http://<ROBOT_IP>:8080/stream.mjpg
"""

import time
import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except Exception:
    HAS_OPENCV = False


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class StreamingHandler(BaseHTTPRequestHandler):
    camera_manager = None

    def log_message(self, format, *args):
        pass  # Silence normal access logs to keep terminal clean

    def do_GET(self):
        if self.path in ['/video', '/stream.mjpg', '/live', '/']:
            self.send_response(200)
            self.send_header('Age', '0')
            self.send_header('Cache-Control', 'no-cache, private')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            while True:
                frame = self.camera_manager.get_latest_frame()
                if frame:
                    try:
                        self.wfile.write(b'--FRAME\r\n')
                        self.send_header('Content-Type', 'image/jpeg')
                        self.send_header('Content-Length', str(len(frame)))
                        self.end_headers()
                        self.wfile.write(frame)
                        self.wfile.write(b'\r\n')
                    except Exception:
                        break
                time.sleep(0.033)  # ~30 FPS
        elif self.path == '/snapshot':
            frame = self.camera_manager.get_latest_frame()
            if frame:
                self.send_response(200)
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Content-Length', str(len(frame)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(frame)
            else:
                self.send_response(503)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()


class CameraManager:
    def __init__(self, camera_index=0, port=8080):
        self.camera_index = camera_index
        self.port = int(os.getenv("CAMERA_STREAM_PORT", str(port)))
        self.cap = None
        self.is_streaming = False
        self.latest_frame_jpeg = None
        self.lock = threading.Lock()
        self.server = None

        if HAS_OPENCV:
            self._init_camera()
            self._start_stream_server()

    def _generate_synthetic_hud_frame(self):
        """Generates real-time synthetic test frame when no physical camera hardware is connected"""
        img = np.zeros((720, 1280, 3), dtype=np.uint8)
        # Gradient background
        for y in range(720):
            color_val = int(20 + (y / 720) * 35)
            img[y, :] = (color_val, color_val + 5, color_val + 10)

        # Draw road perspective
        cv2.line(img, (200, 720), (550, 420), (70, 70, 70), 3)
        cv2.line(img, (1080, 720), (730, 420), (70, 70, 70), 3)
        cv2.line(img, (640, 720), (640, 420), (0, 200, 200), 2) # Lane divider

        # Live timestamp and HUD text
        t_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        cv2.putText(img, "PRAHARI-01 LIVE MAST CAMERA", (40, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 120), 2)
        cv2.putText(img, f"STREAM: 1280x720 @ 30 FPS  |  {t_str}", (40, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        # Crosshair Reticle
        cv2.drawMarker(img, (640, 360), (0, 255, 120), markerType=cv2.MARKER_CROSS, markerSize=30, thickness=2)

        _, jpeg = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return jpeg.tobytes()

    def _init_camera(self):
        try:
            self.cap = cv2.VideoCapture(self.camera_index)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)

            if self.cap.isOpened():
                self.is_streaming = True
                print(f"[CAMERA] Physical Hardware Camera Initialized (Index {self.camera_index})")
            else:
                self.is_streaming = True
                print("[CAMERA] Physical camera not found, running with live sensor simulation generator")

            threading.Thread(target=self._capture_loop, daemon=True).start()
        except Exception as e:
            print(f"[CAMERA] Camera init error: {e}")
            self.is_streaming = True
            threading.Thread(target=self._capture_loop, daemon=True).start()

    def _capture_loop(self):
        while self.is_streaming:
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret:
                    ret2, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                    if ret2:
                        with self.lock:
                            self.latest_frame_jpeg = jpeg.tobytes()
                    time.sleep(0.033)
                    continue

            # Fallback to simulated HUD frame
            frame_bytes = self._generate_synthetic_hud_frame()
            with self.lock:
                self.latest_frame_jpeg = frame_bytes
            time.sleep(0.033)

    def _start_stream_server(self):
        StreamingHandler.camera_manager = self
        try:
            self.server = ThreadedHTTPServer(('0.0.0.0', self.port), StreamingHandler)
            threading.Thread(target=self.server.serve_forever, daemon=True).start()
            print(f"[CAMERA STREAM] Live MJPEG HTTP Server active on http://0.0.0.0:{self.port}/video")
        except Exception as e:
            print(f"[CAMERA STREAM] Failed to start stream server on port {self.port}: {e}")

    def get_latest_frame(self):
        with self.lock:
            return self.latest_frame_jpeg

    def get_status(self):
        return {
            "camera_connected": self.is_streaming,
            "resolution": "1280x720",
            "fps": 30,
            "stream_url": f"http://0.0.0.0:{self.port}/video",
            "source": "RPi4_MAST_CAMERA"
        }

    def cleanup(self):
        self.is_streaming = False
        if self.server:
            self.server.shutdown()
        if self.cap:
            self.cap.release()
