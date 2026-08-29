import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { VehicleDetector } from './detectors/vehicle_detector.js';
import { PlateDetector } from './detectors/plate_detector.js';
import { OCREngine } from './detectors/ocr_engine.js';
import { AmbulanceDetector } from './detectors/ambulance_detector.js';
import { PedestrianDetector } from './detectors/pedestrian_detector.js';
import { WardenGestureRecognizer } from './detectors/warden_gesture.js';
import { AudioSirenDetector } from './detectors/audio_siren.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.AI_SERVICE_PORT || '8000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize detectors
const vehicleDetector = new VehicleDetector();
const plateDetector = new PlateDetector();
const ocrEngine = new OCREngine();
const ambulanceDetector = new AmbulanceDetector();
const pedestrianDetector = new PedestrianDetector();
const wardenGesture = new WardenGestureRecognizer();
const audioSirenDetector = new AudioSirenDetector();

const startTime = Date.now();

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: "ok",
    service: "PRAHARI Live AI Multi-Modal Traffic Perception Microservice (Node.js Migrated)",
    version: "2.0.0",
    uptime: Number(((Date.now() - startTime) / 1000).toFixed(2)),
    models: {
      vehicle_detector: "YOLOv8n-Traffic",
      anpr_ocr: "PaddleOCR-IndianHSRP",
      ambulance_detector: "Dual-Modal Flasher+Acoustic",
      crosswalk_safety: "Spatial Proximity Zone V2",
      gesture_recognizer: "PoseHand-Warden",
      audio_siren: "FFT Harmonic Sweep Analyzer"
    }
  });
});

// Models List
app.get('/models', (req, res) => {
  res.json({
    active_models: [
      { id: "yolov8_traffic", name: "YOLOv8 Traffic Object Detector", status: "LOADED", classes: ["car", "motorcycle", "bus", "truck", "ambulance", "person"] },
      { id: "anpr_ocr", name: "Indian License Plate OCR Engine", status: "LOADED", patterns: "HSRP 28 Indian States + BH Series" },
      { id: "ambulance_siren", name: "Ambulance Visual & Siren Classifier", status: "LOADED", harmonic_range: "400-1500 Hz" },
      { id: "crosswalk_risk", name: "Crosswalk Pedestrian Collision Engine", status: "LOADED", zones: "Configurable Polygon" },
      { id: "warden_gestures", name: "Traffic Warden Hand Gesture Net", status: "LOADED", gestures: ["STOP", "GO", "SLOW", "TURN_LEFT", "TURN_RIGHT"] }
    ]
  });
});

// Frame Detection
app.post('/detect/frame', (req, res) => {
  const { image, camera_id = "CAM-01", lanes, siren_confidence = 0.0, hint_detections } = req.body;
  
  let imageNp = null;
  if (image) {
    imageNp = vehicleDetector.decodeImage(image);
  }

  const result = vehicleDetector.detect(
    imageNp,
    lanes,
    siren_confidence,
    hint_detections
  );
  
  result.camera_id = camera_id;
  res.json(result);
});

// ANPR Detection
app.post('/detect/anpr', (req, res) => {
  const { plate_hint = "MH12AB1234", camera_id = "CAM-01" } = req.body;
  const ocrResult = ocrEngine.processCrop(null, plate_hint);
  
  res.json({
    success: true,
    camera_id,
    plate: ocrResult
  });
});

// Ambulance Detection
app.post('/detect/ambulance', (req, res) => {
  const { class_name = "ambulance", confidence = 0.95, bbox = [0.3, 0.2, 0.4, 0.5], siren_confidence = 0.0 } = req.body;
  
  const event = ambulanceDetector.evaluateEmergency(
    class_name,
    confidence,
    bbox,
    siren_confidence
  );

  res.json({
    success: true,
    ambulance_event: event
  });
});

// Pedestrian Safety Check
app.post('/detect/pedestrians', (req, res) => {
  const { pedestrians = [], vehicles = [], crosswalk_zone } = req.body;
  
  if (crosswalk_zone) {
    pedestrianDetector.setCrosswalkZone(crosswalk_zone);
  }

  const riskAssessment = pedestrianDetector.assessRisk(pedestrians, vehicles);

  res.json({
    success: true,
    crosswalk_risk: riskAssessment
  });
});

// Gesture Detection
app.post('/detect/gesture', (req, res) => {
  const { pose_hint = "STOP", confidence = 0.90 } = req.body;
  const gesture = wardenGesture.recognizeGesture(null, pose_hint);

  res.json({
    success: true,
    gesture
  });
});

// Audio Analysis
app.post('/detect/audio', (req, res) => {
  const { audio_buffer, sample_rate = 44100 } = req.body;
  const result = audioSirenDetector.analyzeAudioBuffer(audio_buffer, sample_rate);

  res.json({
    success: true,
    audio_analysis: result
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PRAHARI Node.js AI Service running on http://0.0.0.0:${port}`);
});
