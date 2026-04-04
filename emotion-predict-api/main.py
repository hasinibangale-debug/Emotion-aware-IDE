"""
Emotion prediction API: Logistic Regression on typingSpeed, errorRate, isPaused.
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field
import numpy as np
from sklearn.linear_model import LogisticRegression

# --- Dummy training data (features: typingSpeed, errorRate, isPaused) ---
# Labels: 0 = Frustrated, 1 = Neutral, 2 = Confident
X_TRAIN = np.array(
    [
        [12, 0.55, 1],
        [15, 0.48, 1],
        [18, 0.42, 1],
        [22, 0.38, 0],
        [28, 0.30, 0],
        [35, 0.22, 0],
        [38, 0.18, 0],
        [45, 0.12, 0],
        [52, 0.08, 0],
        [58, 0.05, 0],
        [30, 0.28, 1],
        [40, 0.15, 0],
    ],
    dtype=float,
)
Y_TRAIN = np.array([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 1, 2], dtype=int)

MOOD_BY_CLASS = {0: "Frustrated", 1: "Neutral", 2: "Confident"}


def train_emotion_model() -> LogisticRegression:
    clf = LogisticRegression(max_iter=1000, random_state=42)
    clf.fit(X_TRAIN, Y_TRAIN)
    return clf


model = train_emotion_model()

app = FastAPI(title="Emotion Prediction", version="1.0.0")


class PredictRequest(BaseModel):
    typingSpeed: float = Field(..., ge=0, description="Keystrokes per minute (or similar scale)")
    errorRate: float = Field(..., ge=0, le=1, description="Backspace / error rate 0–1")
    isPaused: int = Field(..., ge=0, le=1, description="1 if paused, else 0")


class PredictResponse(BaseModel):
    mood: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    x = np.array(
        [[body.typingSpeed, body.errorRate, float(body.isPaused)]],
        dtype=float,
    )
    label = int(model.predict(x)[0])
    mood = MOOD_BY_CLASS[label]
    return PredictResponse(mood=mood)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
