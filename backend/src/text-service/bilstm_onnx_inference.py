"""
BiLSTM ONNX Text Emotion Inference
Performs emotion detection on text using the ONNX BiLSTM model

This script:
1. Loads the ONNX model (emotion_bilstm_final.onnx)
2. Tokenizes and preprocesses input text
3. Runs inference to predict emotion
4. Returns emotion label with confidence scores

IMPORTANT NOTES:
- Model expects 6 emotion classes: angry, disgust, fear, happy, neutral, sad (NO 'surprise')
- The tokenizer uses a simplified vocabulary - for best results, provide the actual
  vocabulary file (vocab.json) that was used during model training
- Current implementation uses a basic vocabulary which may not match training data exactly
"""

import sys
import json
import numpy as np
import warnings
import re
warnings.filterwarnings('ignore')

try:
    import onnxruntime as ort
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "onnxruntime not installed. Install with: pip install onnxruntime"
    }))
    sys.exit(1)

class TextTokenizer:
    """
    Simple text tokenizer that mimics the tokenization used during model training
    """
    def __init__(self, max_length=80, vocab_size=10000):
        self.max_length = max_length
        self.vocab_size = vocab_size
        # Common emotion-related vocabulary (simplified)
        self.word_index = self._build_basic_vocab()
    
    def _build_basic_vocab(self):
        """Build a basic vocabulary for emotion detection"""
        # This is a simplified vocabulary. In production, load the actual vocab used during training
        common_words = [
            # Padding and unknown
            '<PAD>', '<UNK>',
            # Common words
            'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must',
            'can', 'cannot', 'cant',
            'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then',
            'not', 'no', 'yes',
            # Emotion-related words
            'happy', 'sad', 'angry', 'fear', 'scared', 'afraid',
            'joy', 'joyful', 'excited', 'excited',
            'upset', 'frustrated', 'annoyed', 'mad',
            'love', 'hate', 'like', 'dislike',
            'good', 'bad', 'great', 'terrible', 'awful',
            'feel', 'feeling', 'felt',
            'very', 'really', 'so', 'too', 'much',
            'sorry', 'please', 'thank', 'thanks',
            'help', 'need', 'want', 'wish',
            'think', 'thought', 'know', 'believe',
            'see', 'look', 'hear', 'listen',
            'go', 'come', 'get', 'make', 'take',
            'day', 'time', 'way', 'people', 'thing',
            'work', 'life', 'world', 'home', 'friend',
            'tell', 'say', 'said', 'ask', 'asked',
            'just', 'now', 'today', 'never', 'always',
            'about', 'after', 'before', 'because', 'when', 'where',
            'what', 'why', 'how', 'who', 'which'
        ]
        
        # Create word to index mapping
        word_index = {word: idx + 1 for idx, word in enumerate(common_words)}
        word_index['<PAD>'] = 0
        word_index['<UNK>'] = 1
        
        return word_index
    
    def preprocess_text(self, text):
        """Clean and normalize text"""
        # Convert to lowercase
        text = text.lower()
        # Remove special characters and numbers
        text = re.sub(r'[^a-z\s]', '', text)
        # Remove extra whitespace
        text = ' '.join(text.split())
        return text
    
    def tokenize(self, text):
        """
        Convert text to sequence of integers
        Returns: numpy array of shape (1, max_length)
        """
        # Preprocess
        text = self.preprocess_text(text)
        
        # Split into words
        words = text.split()
        
        # Convert to indices
        sequence = []
        for word in words[:self.max_length]:
            # Use word index or unknown token
            idx = self.word_index.get(word, self.word_index['<UNK>'])
            sequence.append(idx)
        
        # Pad sequence to max_length
        if len(sequence) < self.max_length:
            sequence = sequence + [0] * (self.max_length - len(sequence))
        
        # Convert to numpy array with shape (1, max_length)
        return np.array([sequence], dtype=np.int32)


def load_onnx_model(model_path):
    """Load ONNX model"""
    try:
        session = ort.InferenceSession(
            model_path,
            providers=['CPUExecutionProvider']
        )
        return session
    except Exception as e:
        raise Exception(f"Failed to load ONNX model: {str(e)}")


def predict_emotion(session, text, emotion_labels, tokenizer):
    """
    Predict emotion from text using ONNX model
    
    Args:
        session: ONNX runtime session
        text: Input text string
        emotion_labels: List of emotion label names
        tokenizer: TextTokenizer instance
    
    Returns:
        dict with emotion prediction results
    """
    try:
        # Tokenize text
        input_sequence = tokenizer.tokenize(text)
        
        # Get input name from model
        input_name = session.get_inputs()[0].name
        
        # Run inference
        outputs = session.run(None, {input_name: input_sequence})
        
        # Get predictions (softmax probabilities)
        predictions = outputs[0][0]  # Shape: (num_classes,)
        
        # Validate predictions match emotion labels
        if len(predictions) != len(emotion_labels):
            return {
                "success": False,
                "error": f"Model output size ({len(predictions)}) doesn't match emotion labels count ({len(emotion_labels)}). Model expects {len(predictions)} emotions."
            }
        
        # Get emotion with highest probability
        max_idx = np.argmax(predictions)
        max_confidence = float(predictions[max_idx])
        
        # Create scores dictionary
        scores = {}
        for idx, label in enumerate(emotion_labels):
            scores[label] = float(predictions[idx])
        
        return {
            "success": True,
            "emotion": emotion_labels[max_idx],
            "confidence": max_confidence,
            "scores": scores,
            "model": "bilstm_onnx",
            "text_length": len(text),
            "tokens_used": int(np.count_nonzero(input_sequence))
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Prediction failed: {str(e)}"
        }


def main():
    """Main function"""
    try:
        # Parse arguments
        if len(sys.argv) < 4:
            print(json.dumps({
                "success": False,
                "error": "Usage: python bilstm_onnx_inference.py <model_path> <text> <emotion_labels>"
            }))
            sys.exit(1)
        
        model_path = sys.argv[1]
        text = sys.argv[2]
        emotion_labels = sys.argv[3].split(',')
        
        # Validate inputs
        if not text or len(text.strip()) == 0:
            print(json.dumps({
                "success": False,
                "error": "Empty text provided"
            }))
            sys.exit(1)
        
        # Initialize tokenizer
        tokenizer = TextTokenizer(max_length=80)
        
        # Load model
        session = load_onnx_model(model_path)
        
        # Run prediction
        result = predict_emotion(session, text, emotion_labels, tokenizer)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
