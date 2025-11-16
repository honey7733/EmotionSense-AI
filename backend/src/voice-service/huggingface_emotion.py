"""
HuggingFace Speech Emotion Classification
Supports multiple audio emotion models including:
- superb/wav2vec2-base-superb-er
- ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
- prithivMLmods/Speech-Emotion-Classification

NOTE: This script ONLY works with Wav2Vec2 audio models.
      Text models (RoBERTa, BERT, etc.) will NOT work here!
"""

import sys
import json
import warnings
warnings.filterwarnings('ignore')

# Disable TensorFlow warnings
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    from transformers import Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor, AutoConfig
    import torch
    import librosa
except ImportError as e:
    error_result = {
        "success": False,
        "error": f"Missing dependencies: {str(e)}. Install with: pip install transformers torch librosa soundfile"
    }
    print(json.dumps(error_result))
    sys.exit(1)

# Default label mapping (works for most emotion models)
DEFAULT_LABELS = {
    "0": "angry",
    "1": "calm",
    "2": "disgust",
    "3": "fear",
    "4": "happy",
    "5": "neutral",
    "6": "sad",
    "7": "surprise"
}

def get_label_mapping(model_name, config):
    """
    Get emotion labels for the model.
    Try to use model's config first, fall back to default mapping.
    """
    try:
        if hasattr(config, 'id2label') and config.id2label:
            return config.id2label
    except:
        pass
    
    # Use default labels
    return DEFAULT_LABELS

def classify_audio(model_name, audio_path):
    """
    Classify emotion from audio file using HuggingFace Wav2Vec2 models
    """
    try:
        # Validate model type first
        print(f"Loading model config: {model_name}...", file=sys.stderr)
        config = AutoConfig.from_pretrained(model_name)
        
        # Check if this is an audio model
        if config.model_type not in ['wav2vec2', 'wavlm', 'hubert']:
            return {
                "success": False,
                "error": f"Model '{model_name}' is a '{config.model_type}' model, not an audio model! Please use a Wav2Vec2/WavLM/Hubert model for audio emotion detection."
            }
        
        # Load model and processor
        print(f"Loading model: {model_name}...", file=sys.stderr)
        model = Wav2Vec2ForSequenceClassification.from_pretrained(model_name)
        processor = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        
        # Get label mapping
        id2label = get_label_mapping(model_name, config)
        
        # Load and resample audio to 16kHz
        print(f"Loading audio: {audio_path}...", file=sys.stderr)
        speech, sample_rate = librosa.load(audio_path, sr=16000)
        
        # Process audio
        inputs = processor(
            speech,
            sampling_rate=sample_rate,
            return_tensors="pt",
            padding=True
        )
        
        # Get predictions
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=1).squeeze()
            
            # Handle single dimension output
            if probs.dim() == 0:
                probs = probs.unsqueeze(0)
            
            probs = probs.tolist()
        
        # Build scores dictionary
        scores = {}
        for i in range(len(probs)):
            emotion_key = str(i)
            emotion = id2label.get(emotion_key, f"emotion_{i}")
            scores[emotion] = float(probs[i])
        
        # Get dominant emotion
        max_prob = max(probs)
        dominant_idx = probs.index(max_prob)
        dominant_emotion = id2label.get(str(dominant_idx), f"emotion_{dominant_idx}")
        
        print(f"✓ Detected: {dominant_emotion} ({max_prob:.1%})", file=sys.stderr)
        
        return {
            "success": True,
            "emotion": dominant_emotion,
            "confidence": float(max_prob),
            "scores": scores,
            "model": model_name
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error details:\n{error_details}", file=sys.stderr)
        
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    try:
        # Get arguments: model_name, audio_path
        model_name = sys.argv[1]
        audio_path = sys.argv[2]
        
        # Run classification
        result = classify_audio(model_name, audio_path)
        
        # Output JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
