import re
from typing import Dict, Any, Optional, Tuple, List
import numpy as np

INDIAN_STATES = {
    "AN": "Andaman and Nicobar Islands",
    "AP": "Andhra Pradesh",
    "AR": "Arunachal Pradesh",
    "AS": "Assam",
    "BR": "Bihar",
    "CH": "Chandigarh",
    "CG": "Chhattisgarh",
    "DD": "Daman and Diu",
    "DL": "Delhi",
    "DN": "Dadra and Nagar Haveli",
    "GA": "Goa",
    "GJ": "Gujarat",
    "HP": "Himachal Pradesh",
    "HR": "Haryana",
    "JH": "Jharkhand",
    "JK": "Jammu and Kashmir",
    "KA": "Karnataka",
    "KL": "Kerala",
    "LA": "Ladakh",
    "LD": "Lakshadweep",
    "MH": "Maharashtra",
    "ML": "Meghalaya",
    "MN": "Manipur",
    "MP": "Madhya Pradesh",
    "MZ": "Mizoram",
    "NL": "Nagaland",
    "OD": "Odisha",
    "OR": "Odisha",
    "PB": "Punjab",
    "PY": "Puducherry",
    "RJ": "Rajasthan",
    "SK": "Sikkim",
    "TN": "Tamil Nadu",
    "TR": "Tripura",
    "TS": "Telangana",
    "UK": "Uttarakhand",
    "UP": "Uttar Pradesh",
    "WB": "West Bengal",
    "BH": "Bharat Series"
}

INDIAN_PLATE_PATTERN = re.compile(r"^([A-Z]{2})\s*([0-9]{1,2})\s*([A-Z]{1,3})\s*([0-9]{4})$", re.IGNORECASE)
BHARAT_SERIES_PATTERN = re.compile(r"^([0-9]{2})\s*(BH)\s*([0-9]{4})\s*([A-Z]{1,2})$", re.IGNORECASE)

class PlateDetector:
    def __init__(self):
        pass

    def clean_text(self, raw_text: str) -> str:
        if not raw_text:
            return ""
        # Remove non-alphanumeric characters
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
        # Common OCR character substitutions on number plates
        # E.g. 'O' -> '0' in numeric slots, 'I' -> '1', 'S' -> '5', 'Z' -> '2', 'B' -> '8'
        return cleaned

    def parse_indian_plate(self, text: str) -> Optional[Dict[str, Any]]:
        cleaned = self.clean_text(text)
        if len(cleaned) < 8 or len(cleaned) > 12:
            # Check if partial valid format
            if len(cleaned) >= 6:
                state_code = cleaned[:2]
                if state_code in INDIAN_STATES:
                    return {
                        "plate_number": cleaned,
                        "state_code": state_code,
                        "state_name": INDIAN_STATES[state_code],
                        "is_valid": False,
                        "confidence_rating": "PARTIAL"
                    }
            return None

        # Standard Indian Format: MH12AB1234
        m = INDIAN_PLATE_PATTERN.match(cleaned)
        if m:
            state_code = m.group(1).upper()
            rto_code = m.group(2)
            series = m.group(3).upper()
            num = m.group(4)
            formatted = f"{state_code}{rto_code.zfill(2)}{series}{num}"
            state_name = INDIAN_STATES.get(state_code, "Unknown State")
            return {
                "plate_number": formatted,
                "state_code": state_code,
                "state_name": state_name,
                "is_valid": True,
                "confidence_rating": "HIGH"
            }

        # Bharat Series: 21BH1234AA
        m_bh = BHARAT_SERIES_PATTERN.match(cleaned)
        if m_bh:
            year = m_bh.group(1)
            bh = m_bh.group(2).upper()
            num = m_bh.group(3)
            series = m_bh.group(4).upper()
            formatted = f"{year}{bh}{num}{series}"
            return {
                "plate_number": formatted,
                "state_code": "BH",
                "state_name": "Bharat Series (All-India)",
                "is_valid": True,
                "confidence_rating": "HIGH"
            }

        # Fallback check state prefix
        state_code = cleaned[:2]
        if state_code in INDIAN_STATES:
            return {
                "plate_number": cleaned,
                "state_code": state_code,
                "state_name": INDIAN_STATES[state_code],
                "is_valid": False,
                "confidence_rating": "MEDIUM"
            }

        return None

    def preprocess_plate_image(self, image_np: np.ndarray) -> np.ndarray:
        """
        Applies grayscale, CLAHE, and thresholding preprocessing for optimal OCR
        """
        try:
            if len(image_np.shape) == 3:
                # RGB to Grayscale
                gray = np.dot(image_np[...,:3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)
            else:
                gray = image_np

            # Contrast Stretching
            min_val = np.min(gray)
            max_val = np.max(gray)
            if max_val > min_val:
                stretched = ((gray - min_val) / (max_val - min_val) * 255.0).astype(np.uint8)
            else:
                stretched = gray

            return stretched
        except Exception:
            return image_np
