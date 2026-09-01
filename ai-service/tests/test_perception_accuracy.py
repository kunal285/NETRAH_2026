import pytest
import numpy as np
import cv2

from app.services.quality_service import quality_service
from app.services.detector import PerceptionDetector
from app.config import settings

def test_image_quality_blur_detection():
    # 1. Clear sharp image with edges
    sharp_img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.rectangle(sharp_img, (20, 20), (80, 80), (255, 255, 255), 3)
    cv2.putText(sharp_img, "MH12", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    res_sharp = quality_service.evaluate_image_quality(sharp_img)
    assert res_sharp["is_usable"] is True
    assert res_sharp["blur_score"] > settings.MIN_LAPLACIAN_BLUR_SCORE

    # 2. Heavily blurred image
    blurry_img = cv2.GaussianBlur(sharp_img, (25, 25), 10)
    res_blurry = quality_service.evaluate_image_quality(blurry_img)
    assert res_blurry["is_usable"] is False
    assert res_blurry["status"] == "blurry"

def test_plate_normalization_and_validation():
    detector = PerceptionDetector()

    # Valid Indian HSRP Plate
    valid_text, conf, status = detector.normalize_plate_text("MH 12 AB 1234")
    assert status == "verified"
    assert valid_text == "MH12AB1234"
    assert conf >= 0.85

    # OCR character confusion (O -> 0 for district code)
    confused_text, conf2, status2 = detector.normalize_plate_text("DL O1 AB 1234")
    assert status2 == "verified"
    assert confused_text == "DL01AB1234"

    # Non-Indian / Garbled OCR output
    invalid_text, conf3, status3 = detector.normalize_plate_text("XYZ999")
    assert status3 == "uncertain"
    assert invalid_text is None
    assert conf3 < 0.50

def test_temporal_confirmation_for_ambulance():
    detector = PerceptionDetector()

    # Create synthetic frame with ambulance beacon
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw vehicle body
    cv2.rectangle(frame, (200, 200), (440, 380), (200, 200, 200), -1)
    # Draw flashing red/blue beacon on roof
    cv2.rectangle(frame, (300, 210), (320, 230), (0, 0, 255), -1) # Red
    cv2.rectangle(frame, (320, 210), (340, 230), (255, 0, 0), -1) # Blue

    # Frame 1: Candidate observation
    out1 = detector.process_frame(frame)
    assert out1["ambulance"]["detected"] is True
    assert out1["ambulance"]["candidate_frames"] == 1
    assert out1["ambulance"]["confirmed"] is False

    # Frame 2: Candidate accumulation
    out2 = detector.process_frame(frame)
    assert out2["ambulance"]["detected"] is True
    assert out2["ambulance"]["candidate_frames"] == 2
    assert out2["ambulance"]["confirmed"] is False

    # Frame 3: Confirmed after AMBULANCE_CONFIRMATION_FRAMES
    out3 = detector.process_frame(frame)
    assert out3["ambulance"]["detected"] is True
    assert out3["ambulance"]["candidate_frames"] >= 3
    assert out3["ambulance"]["confirmed"] is True

def test_roi_filtering():
    detector = PerceptionDetector()
    frame_w, frame_h = 1000, 1000

    # Inside ROI
    inside_bbox = [500, 500, 100, 100]
    assert detector.is_inside_roi(inside_bbox, frame_w, frame_h) is True

    # Outside ROI (e.g. top sky region at y=20)
    outside_bbox = [500, 20, 100, 50]
    assert detector.is_inside_roi(outside_bbox, frame_w, frame_h) is False

def test_unique_counting_without_duplicates():
    detector = PerceptionDetector()
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    cv2.rectangle(frame, (400, 480), (700, 680), (180, 180, 180), -1)

    # Process same vehicle across 5 frames
    for _ in range(5):
        out = detector.process_frame(frame)

    # Total unique count should be 1, not 5
    assert out["counts"]["total_unique"] == 1
    assert out["counts"]["current_visible"] == 1
