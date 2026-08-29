export const INDIAN_STATES = {
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
};

const INDIAN_PLATE_PATTERN = /^([A-Z]{2})\s*([0-9]{1,2})\s*([A-Z]{1,3})\s*([0-9]{4})$/i;
const BHARAT_SERIES_PATTERN = /^([0-9]{2})\s*(BH)\s*([0-9]{4})\s*([A-Z]{1,2})$/i;

export class PlateDetector {
  cleanText(rawText) {
    if (!rawText) return "";
    // Remove non-alphanumeric characters
    const cleaned = rawText.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return cleaned;
  }

  parseIndianPlate(text) {
    const cleaned = this.cleanText(text);
    if (cleaned.length < 8 || cleaned.length > 12) {
      if (cleaned.length >= 6) {
        const stateCode = cleaned.slice(0, 2);
        if (INDIAN_STATES[stateCode]) {
          return {
            plate_number: cleaned,
            state_code: stateCode,
            state_name: INDIAN_STATES[stateCode],
            is_valid: false,
            confidence_rating: "PARTIAL"
          };
        }
      }
      return null;
    }

    // Standard Indian Format: MH12AB1234
    const m = cleaned.match(INDIAN_PLATE_PATTERN);
    if (m) {
      const stateCode = m[1].toUpperCase();
      const rtoCode = m[2];
      const series = m[3].toUpperCase();
      const num = m[4];
      const formatted = `${stateCode}${rtoCode.padStart(2, '0')}${series}${num}`;
      const stateName = INDIAN_STATES[stateCode] || "Unknown State";
      return {
        plate_number: formatted,
        state_code: stateCode,
        state_name: stateName,
        is_valid: true,
        confidence_rating: "HIGH"
      };
    }

    // Bharat Series: 21BH1234AA
    const mBh = cleaned.match(BHARAT_SERIES_PATTERN);
    if (mBh) {
      const year = mBh[1];
      const bh = mBh[2].toUpperCase();
      const num = mBh[3];
      const series = mBh[4].toUpperCase();
      const formatted = `${year}${bh}${num}${series}`;
      return {
        plate_number: formatted,
        state_code: "BH",
        state_name: "Bharat Series (All-India)",
        is_valid: true,
        confidence_rating: "HIGH"
      };
    }

    // Fallback check state prefix
    const stateCode = cleaned.slice(0, 2);
    if (INDIAN_STATES[stateCode]) {
      return {
        plate_number: cleaned,
        state_code: stateCode,
        state_name: INDIAN_STATES[stateCode],
        is_valid: false,
        confidence_rating: "MEDIUM"
      };
    }

    return null;
  }

  preprocessPlateImage(imageNp) {
    // Simply return as JS handles decoding differently (Base64 or image buffer)
    return imageNp;
  }
}
