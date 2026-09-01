import time
import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import Optional

from ..schemas.detection import FaceEnrollRequest
from ..services.vision_service import vision_service

faces_router = APIRouter(prefix="/api/faces", tags=["Face Recognition"])

@faces_router.get("")
def list_enrolled_faces():
    detector = vision_service.detector
    faces = []
    for pid, data in detector.enrolled_faces.items():
        faces.append({
            "personId": pid,
            "name": data.get("name"),
            "imageUrl": data.get("imageUrl"),
            "createdAt": data.get("createdAt")
        })
    return {"success": True, "faces": faces, "total": len(faces)}

@faces_router.post("/enroll")
def enroll_face(payload: FaceEnrollRequest):
    detector = vision_service.detector
    try:
        embedding = np.ones((128,), dtype=np.float32) * 0.15
        if payload.image:
            clean_b64 = payload.image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
            img_bytes = base64.b64decode(clean_b64)
            face_img = detector.decode_image_bytes(img_bytes)
            if face_img is not None:
                resized = cv2.resize(face_img, (32, 32))
                hr = cv2.calcHist([resized], [0], None, [32], [0, 256]).flatten()
                hg = cv2.calcHist([resized], [1], None, [32], [0, 256]).flatten()
                hb = cv2.calcHist([resized], [2], None, [32], [0, 256]).flatten()
                embedding = np.concatenate([hr, hg, hb, np.mean(resized, axis=(0, 1))])[:128]
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm

        detector.enrolled_faces[payload.personId] = {
            "personId": payload.personId,
            "name": payload.name,
            "embedding": embedding,
            "imageUrl": None,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        return {
            "success": True,
            "message": f"Successfully enrolled face for {payload.name}",
            "personId": payload.personId
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@faces_router.delete("/{person_id}")
def delete_face(person_id: str):
    detector = vision_service.detector
    if person_id in detector.enrolled_faces:
        del detector.enrolled_faces[person_id]
        return {"success": True, "message": f"Deleted face {person_id}"}
    raise HTTPException(status_code=404, detail="Person not found")
