import cv2
import numpy as np
from typing import Dict, Any, Tuple
from ..config import settings

class QualityService:
    """
    Evaluates image quality for ANPR plate crops and face regions before running OCR or embeddings.
    Calculates Laplacian blur variance, mean brightness, contrast std-dev, and dimension checks.
    """

    def evaluate_image_quality(self, img: np.ndarray, min_w: int = 40, min_h: int = 15) -> Dict[str, Any]:
        if img is None or img.size == 0:
            return {
                "is_usable": False,
                "blur_score": 0.0,
                "brightness": 0.0,
                "contrast": 0.0,
                "status": "empty_frame",
                "width": 0,
                "height": 0
            }

        h, w = img.shape[:2]
        if w < min_w or h < min_h:
            return {
                "is_usable": False,
                "blur_score": 0.0,
                "brightness": 0.0,
                "contrast": 0.0,
                "status": "low_resolution",
                "width": w,
                "height": h
            }

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # 1. Laplacian Blur Score (Variance of Laplacian)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        blur_score = float(laplacian.var())

        # 2. Brightness & Contrast
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))

        is_usable = True
        status = "optimal"

        if blur_score < settings.MIN_LAPLACIAN_BLUR_SCORE:
            is_usable = False
            status = "blurry"
        elif brightness < settings.MIN_BRIGHTNESS:
            is_usable = False
            status = "too_dark"
        elif brightness > settings.MAX_BRIGHTNESS:
            is_usable = False
            status = "too_bright"
        elif contrast < 12.0:
            is_usable = False
            status = "low_contrast"

        return {
            "is_usable": is_usable,
            "blur_score": round(blur_score, 2),
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "status": status,
            "width": w,
            "height": h
        }

    def preprocess_plate_crop(self, crop: np.ndarray) -> np.ndarray:
        """
        Enhance plate contrast and sharpness using CLAHE and bilateral filtering.
        """
        if crop is None or crop.size == 0:
            return crop

        # Standardize size (fixed height 64)
        target_h = 64
        target_w = int(crop.shape[1] * (target_h / max(1, crop.shape[0])))
        resized = cv2.resize(crop, (max(128, target_w), target_h), interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # Contrast Limited Adaptive Histogram Equalization (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Bilateral filter to smooth noise while preserving character edges
        denoised = cv2.bilateralFilter(enhanced, 7, 50, 50)

        # Unsharp masking for crisp edges
        gaussian = cv2.GaussianBlur(denoised, (0, 0), 2.0)
        sharpened = cv2.addWeighted(denoised, 1.5, gaussian, -0.5, 0)

        return sharpened

quality_service = QualityService()
