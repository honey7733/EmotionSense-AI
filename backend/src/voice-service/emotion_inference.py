"""
⚠️ WARNING: This BiLSTM model is a TEXT emotion model, NOT an audio model!
It expects tokenized text (integer sequences), not audio features.
The model architecture uses Embedding layer which is for text processing.

This script is included for compatibility but will NOT work correctly for audio emotion detection.
For audio emotion, use the HuggingFace voice emotion models instead.
"""

import sys
import json
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Disable TensorFlow warnings
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow as tf
from tensorflow import keras

def predict_emotion(model_path, audio_path, emotion_labels):
    """
    ⚠️ This function cannot work because the model is a TEXT model, not AUDIO model.
    It expects tokenized text sequences as input, not audio features.
    """
    return {
        "success": False,
        "error": "This BiLSTM model (emotion_bilstm_final.h5) is a TEXT emotion model that expects tokenized text input, not audio. The model uses an Embedding layer which processes integer sequences (word tokens), not audio features. Please use the HuggingFace audio emotion model instead for voice emotion detection."
    }

def predict_emotion_old_attempt(model_path, audio_path, emotion_labels):
    """
    OLD ATTEMPT - kept for reference
    This was trying to use the model for audio but the model is for text
    
    The model architecture:
    - Input: (None, 80) integer sequences (tokenized text, 80 tokens max)
    - Embedding: Converts tokens to (None, 80, 128) embeddings  
    - BiLSTM: Processes sequences → (None, 80, 256)
    - Attention: Pools to (None, 256)
    - Dense layers: Classifies to 6 emotions
    
    This CANNOT work with audio MFCCs!
    """
    return {
        "success": False,
        "error": "Model architecture mismatch: This is a text emotion model with Embedding layer, not an audio model"
    }

if __name__ == "__main__":
    try:
        # Get arguments
        model_path = sys.argv[1]
        audio_path = sys.argv[2]
        emotion_labels = sys.argv[3].split(',')
        
        # Run prediction
        result = predict_emotion(model_path, audio_path, emotion_labels)
        
        # Output JSON result
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
