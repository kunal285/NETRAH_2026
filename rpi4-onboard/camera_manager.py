"""
PRAHARI Raspberry Pi Camera Manager (Camera 2)
Manages USB / CSI camera on the Raspberry Pi 4 for secondary video perception.
"""

import time
import threading

try:
    import cv2
    HAS_OPENCV = True
except Exception:
    HAS_OPENCV = False


class CameraManager:
    def __init__(self, camera_index=0):
        self.camera_index = camera_index
        self.cap = None
        self.is_streaming = False
        self.latest_frame_jpeg = None
        self.lock = threading.Lock()

        if HAS_OPENCV:
            self._init_camera()

    def _init_camera(self):
        try:
            self.cap = cv2.VideoCapture(self.camera_index)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            if self.cap.isOpened():
                self.is_streaming = True
                threading.Thread(target=self._capture_loop, daemon=True).start()
                print("[CAMERA] RPi Secondary Camera Initialized (1280x720 @ 30 FPS)")
            else:
                self.is_streaming = False
        except Exception as e:
            self.is_streaming = False

    def _capture_loop(self):
        while self.is_streaming and self.cap:
            ret, frame = self.cap.read()
            if ret:
                ret2, jpeg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret2:
                    with self.lock:
                        self.latest_frame_jpeg = jpeg.tobytes()
            time.sleep(0.033) # ~30 FPS

    def get_latest_frame(self):
        with self.lock:
            return self.latest_frame_jpeg

    def get_status(self):
        return {
            "camera_connected": self.is_streaming,
            "resolution": "1280x720",
            "fps": 30 if self.is_streaming else 0,
            "source": "RPi4_USB_CSI_CAM"
        }

    def cleanup(self):
        self.is_streaming = False
        if self.cap:
            self.cap.release()
