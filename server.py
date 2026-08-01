"""
Mise AI - Vision Server (YOLOv8 food detector + Gemini chat)
=============================================================
Install:  pip install flask flask-cors Pillow requests ultralytics
Run:      python server.py
Open:     http://localhost:5000

/analyze uses YOLOv8 for food-only detection.
/chat and /test still use Gemini.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import base64
import io
import json
import os
import re
import requests

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

app = Flask(__name__, static_folder='.')
CORS(app)

GEMINI_API_KEY = os.environ.get(
    'GEMINI_API_KEY',
    'AQ.Ab8RN6K0P41D5vWbNdp7LkYhTGl9BDhuRPWUjJFhR9bVr9_IiA'
)
GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

YOLO_WEIGHTS = os.environ.get('YOLO_WEIGHTS', 'yolov8n.pt')
YOLO_CONFIDENCE = float(os.environ.get('YOLO_CONFIDENCE', '0.25'))
YOLO_MAX_DIM = int(os.environ.get('YOLO_MAX_DIM', '1024'))
YOLO_MODEL = None
YOLO_MODEL_ERROR = None

DEFAULT_FOOD_PROFILE = {
    'cuisine': 'Food',
    'calories_per_100g': 120,
    'description': 'A food item detected by YOLOv8.',
    'macros': {'protein': '3g', 'carbs': '15g', 'fat': '4g', 'fiber': '2g'},
    'key_nutrients': ['Energy', 'Protein'],
    'ingredients': ['main ingredient'],
    'recipe_title': 'Simple Food Prep',
    'recipe_steps': [
        'Wash and prepare the ingredient.',
        'Season or assemble to taste.',
        'Serve while fresh.'
    ],
    'cooking_time': '10 minutes',
    'difficulty': 'Easy'
}

FOOD_METADATA = {
    'apple': {
        'cuisine': 'Fruit',
        'calories_per_100g': 52,
        'description': 'A crisp fruit with a sweet-tart bite.',
        'macros': {'protein': '0.3g', 'carbs': '14g', 'fat': '0.2g', 'fiber': '2.4g'},
        'key_nutrients': ['Vitamin C', 'Fiber', 'Potassium'],
        'ingredients': ['apple'],
        'recipe_title': 'Fresh Apple Snack',
        'recipe_steps': [
            'Wash the apple.',
            'Slice it into wedges.',
            'Serve chilled or with nut butter.'
        ],
        'cooking_time': '5 minutes',
        'difficulty': 'Easy'
    },
    'banana': {
        'cuisine': 'Fruit',
        'calories_per_100g': 89,
        'description': 'A soft, naturally sweet fruit with a creamy texture.',
        'macros': {'protein': '1.1g', 'carbs': '23g', 'fat': '0.3g', 'fiber': '2.6g'},
        'key_nutrients': ['Potassium', 'Vitamin B6', 'Fiber'],
        'ingredients': ['banana'],
        'recipe_title': 'Banana Snack Bowl',
        'recipe_steps': [
            'Peel the banana.',
            'Slice it into a bowl.',
            'Top with yogurt, oats, or peanut butter.'
        ],
        'cooking_time': '5 minutes',
        'difficulty': 'Easy'
    },
    'orange': {
        'cuisine': 'Fruit',
        'calories_per_100g': 47,
        'description': 'A juicy citrus fruit with a bright, fresh aroma.',
        'macros': {'protein': '0.9g', 'carbs': '12g', 'fat': '0.1g', 'fiber': '2.4g'},
        'key_nutrients': ['Vitamin C', 'Folate', 'Fiber'],
        'ingredients': ['orange'],
        'recipe_title': 'Fresh Orange Cup',
        'recipe_steps': [
            'Peel the orange.',
            'Separate into segments.',
            'Serve chilled.'
        ],
        'cooking_time': '5 minutes',
        'difficulty': 'Easy'
    },
    'broccoli': {
        'cuisine': 'Vegetable',
        'calories_per_100g': 34,
        'description': 'A green cruciferous vegetable with a clean, earthy flavor.',
        'macros': {'protein': '2.8g', 'carbs': '7g', 'fat': '0.4g', 'fiber': '2.6g'},
        'key_nutrients': ['Vitamin C', 'Vitamin K', 'Fiber'],
        'ingredients': ['broccoli', 'olive oil', 'salt'],
        'recipe_title': 'Simple Broccoli Side',
        'recipe_steps': [
            'Steam or blanch the broccoli.',
            'Season lightly with salt and oil.',
            'Serve warm.'
        ],
        'cooking_time': '12 minutes',
        'difficulty': 'Easy'
    },
    'carrot': {
        'cuisine': 'Vegetable',
        'calories_per_100g': 41,
        'description': 'A sweet orange root vegetable with a crisp bite.',
        'macros': {'protein': '0.9g', 'carbs': '10g', 'fat': '0.2g', 'fiber': '2.8g'},
        'key_nutrients': ['Beta-carotene', 'Vitamin A', 'Fiber'],
        'ingredients': ['carrot', 'salt', 'oil'],
        'recipe_title': 'Roasted Carrot Snack',
        'recipe_steps': [
            'Cut the carrots into sticks.',
            'Toss with oil and salt.',
            'Roast until tender.'
        ],
        'cooking_time': '20 minutes',
        'difficulty': 'Easy'
    },
    'sandwich': {
        'cuisine': 'Snack',
        'calories_per_100g': 250,
        'description': 'A layered handheld meal with bread and fillings.',
        'macros': {'protein': '12g', 'carbs': '28g', 'fat': '10g', 'fiber': '3g'},
        'key_nutrients': ['Protein', 'Carbohydrates', 'Sodium'],
        'ingredients': ['bread', 'filling', 'spread'],
        'recipe_title': 'Simple Sandwich',
        'recipe_steps': [
            'Layer your filling between bread slices.',
            'Add greens or sauces if desired.',
            'Cut and serve.'
        ],
        'cooking_time': '7 minutes',
        'difficulty': 'Easy'
    },
    'hot dog': {
        'cuisine': 'Snack',
        'calories_per_100g': 290,
        'description': 'A sausage in a soft bun, often served with sauces.',
        'macros': {'protein': '11g', 'carbs': '22g', 'fat': '17g', 'fiber': '1g'},
        'key_nutrients': ['Protein', 'Iron', 'Sodium'],
        'ingredients': ['sausage', 'bun', 'condiments'],
        'recipe_title': 'Quick Hot Dog',
        'recipe_steps': [
            'Warm the sausage.',
            'Place it in a bun.',
            'Add ketchup, mustard, or onions.'
        ],
        'cooking_time': '10 minutes',
        'difficulty': 'Easy'
    },
    'pizza': {
        'cuisine': 'Italian',
        'calories_per_100g': 266,
        'description': 'A cheesy baked flatbread with sauce and toppings.',
        'macros': {'protein': '11g', 'carbs': '33g', 'fat': '10g', 'fiber': '2g'},
        'key_nutrients': ['Calcium', 'Protein', 'Carbohydrates'],
        'ingredients': ['dough', 'tomato sauce', 'cheese'],
        'recipe_title': 'Quick Pizza Slice',
        'recipe_steps': [
            'Warm the crust or dough.',
            'Add sauce, cheese, and toppings.',
            'Bake until melted and crisp.'
        ],
        'cooking_time': '20 minutes',
        'difficulty': 'Medium'
    },
    'donut': {
        'cuisine': 'Dessert',
        'calories_per_100g': 452,
        'description': 'A sweet fried ring with a soft crumb and glaze.',
        'macros': {'protein': '4.9g', 'carbs': '51g', 'fat': '25g', 'fiber': '1.5g'},
        'key_nutrients': ['Energy', 'Carbohydrates', 'Fat'],
        'ingredients': ['dough', 'sugar', 'oil'],
        'recipe_title': 'Glazed Donut Treat',
        'recipe_steps': [
            'Fry or warm the donut.',
            'Add glaze or sugar.',
            'Serve as a dessert snack.'
        ],
        'cooking_time': '10 minutes',
        'difficulty': 'Easy'
    },
    'cake': {
        'cuisine': 'Dessert',
        'calories_per_100g': 350,
        'description': 'A soft baked dessert with a sweet crumb.',
        'macros': {'protein': '4g', 'carbs': '55g', 'fat': '12g', 'fiber': '1g'},
        'key_nutrients': ['Energy', 'Carbohydrates', 'Sugar'],
        'ingredients': ['flour', 'sugar', 'eggs', 'butter'],
        'recipe_title': 'Classic Cake Slice',
        'recipe_steps': [
            'Slice the cake.',
            'Add frosting or fruit if desired.',
            'Serve chilled or at room temperature.'
        ],
        'cooking_time': '5 minutes',
        'difficulty': 'Easy'
    },
    'default': DEFAULT_FOOD_PROFILE,
}

FOOD_CLASSES = {name for name in FOOD_METADATA.keys() if name != 'default'}


def key_is_set():
    k = (GEMINI_API_KEY or '').strip()
    return len(k) > 10 and k not in ('PASTE_YOUR_KEY_HERE', 'YOUR_KEY_HERE', '')


def call_gemini(payload):
    resp = requests.post(
        GEMINI_URL,
        headers={
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY.strip(),
        },
        json=payload,
        timeout=30,
    )
    return resp


def pretty_food_name(name):
    return ' '.join(part.capitalize() for part in name.split())


def get_food_profile(name):
    return FOOD_METADATA.get((name or '').lower(), DEFAULT_FOOD_PROFILE)


def load_yolo_model():
    global YOLO_MODEL, YOLO_MODEL_ERROR

    if YOLO_MODEL_ERROR:
        raise RuntimeError(YOLO_MODEL_ERROR)

    if YOLO_MODEL is not None:
        return YOLO_MODEL

    if YOLO is None:
        YOLO_MODEL_ERROR = 'ultralytics is not installed. Run: pip install ultralytics'
        raise RuntimeError(YOLO_MODEL_ERROR)

    try:
        YOLO_MODEL = YOLO(YOLO_WEIGHTS)
    except Exception as exc:
        YOLO_MODEL_ERROR = f'Could not load YOLO weights "{YOLO_WEIGHTS}": {exc}'
        raise RuntimeError(YOLO_MODEL_ERROR)

    return YOLO_MODEL


def prepare_image(image_b64):
    img_bytes = base64.b64decode(image_b64)
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    if max(img.size) > YOLO_MAX_DIM:
        ratio = YOLO_MAX_DIM / max(img.size)
        new_size = (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
        img = img.resize(new_size, Image.LANCZOS)
    return img


def build_food_entry(class_name, confidence, box, image_size):
    profile = get_food_profile(class_name)
    img_w, img_h = image_size
    x1, y1, x2, y2 = [float(v) for v in box]
    x1 = max(0.0, min(x1, img_w))
    y1 = max(0.0, min(y1, img_h))
    x2 = max(0.0, min(x2, img_w))
    y2 = max(0.0, min(y2, img_h))

    return {
        'name': pretty_food_name(class_name),
        'confidence': int(round(confidence * 100)),
        'cuisine': profile['cuisine'],
        'calories_per_100g': profile['calories_per_100g'],
        'description': profile['description'],
        'macros': dict(profile['macros']),
        'key_nutrients': list(profile['key_nutrients']),
        'ingredients': list(profile['ingredients']),
        'box': {
            'x': round((x1 / img_w) * 100, 1) if img_w else 0,
            'y': round((y1 / img_h) * 100, 1) if img_h else 0,
            'w': round(((x2 - x1) / img_w) * 100, 1) if img_w else 0,
            'h': round(((y2 - y1) / img_h) * 100, 1) if img_h else 0,
        },
    }


def detect_foods(img):
    model = load_yolo_model()
    results = model.predict(source=img, imgsz=640, conf=YOLO_CONFIDENCE, verbose=False)
    if not results:
        return []

    result = results[0]
    if result.boxes is None or len(result.boxes) == 0:
        return []

    names = model.names
    detections = []

    for box in result.boxes:
        cls_idx = int(box.cls.item())
        if isinstance(names, dict):
            raw_name = str(names.get(cls_idx, cls_idx))
        else:
            raw_name = str(names[cls_idx])

        normalized = raw_name.lower()
        if normalized not in FOOD_CLASSES:
            continue

        confidence = float(box.conf.item())
        coords = box.xyxy[0].tolist()
        detections.append(build_food_entry(normalized, confidence, coords, img.size))

    detections.sort(key=lambda item: item['confidence'], reverse=True)
    return detections


def build_food_response(detections):
    labels = [item['name'] for item in detections]
    shown = labels[:3]
    if len(labels) > 3:
        shown.append(f'+{len(labels) - 3} more')

    primary = get_food_profile(detections[0]['name'])
    return {
        'detected': True,
        'scene': f"YOLOv8 detected {len(detections)} food item(s): {', '.join(shown)}.",
        'foods': detections,
        'recipe_title': primary['recipe_title'],
        'recipe_steps': list(primary['recipe_steps']),
        'cooking_time': primary['cooking_time'],
        'difficulty': primary['difficulty'],
        'source': 'YOLOv8',
        'model': YOLO_WEIGHTS,
    }


# Routes

@app.route('/')
def index():
    return send_from_directory('.', 'mise_ai_vision.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json(force=True)
        image_b64 = (data.get('image', '') or '').strip()

        if not image_b64:
            return jsonify({'detected': False, 'error': 'No image data received'}), 400

        img = prepare_image(image_b64)
        detections = detect_foods(img)

        if not detections:
            return jsonify({
                'detected': False,
                'message': 'No supported food items were detected. Try a clearer photo of food.'
            })

        return jsonify(build_food_response(detections))

    except RuntimeError as exc:
        print('[/analyze] Runtime error:', exc)
        return jsonify({'detected': False, 'error': str(exc)}), 500

    except Exception as exc:
        print('[/analyze] Unexpected error:', exc)
        return jsonify({'detected': False, 'error': str(exc)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    if not key_is_set():
        return jsonify({'error': 'No API key set in server.py'}), 401

    try:
        data = request.get_json(force=True)
        messages = data.get('messages', [])
        system = data.get(
            'system',
            'You are Mise AI Chef, a warm and knowledgeable culinary assistant. '
            'Help with cooking, recipes, Nigerian and West African cuisine, '
            'substitutions, and meal planning. Keep replies friendly and concise.'
        )

        if not messages:
            return jsonify({'error': 'No messages provided'}), 400

        contents = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '').strip()
            if not content:
                continue

            gemini_role = 'model' if role == 'assistant' else 'user'
            if contents and contents[-1]['role'] == gemini_role:
                contents[-1]['parts'][0]['text'] += '\n' + content
            else:
                contents.append({'role': gemini_role, 'parts': [{'text': content}]})

        while contents and contents[0]['role'] != 'user':
            contents.pop(0)

        if not contents:
            return jsonify({'error': 'No valid user messages'}), 400

        contents[0]['parts'][0]['text'] = system + '\n\n' + contents[0]['parts'][0]['text']

        payload = {
            'contents': contents,
            'generationConfig': {
                'temperature': 0.7,
                'maxOutputTokens': 600,
            }
        }

        resp = call_gemini(payload)
        if resp.status_code != 200:
            print(f'[/chat] Gemini error {resp.status_code}:', resp.text[:300])
            return jsonify({'error': f'Gemini error {resp.status_code}'}), 502

        reply = resp.json()['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'reply': reply})

    except Exception as exc:
        print('[/chat] Error:', exc)
        return jsonify({'error': str(exc)}), 500


@app.route('/test', methods=['GET'])
def test_key():
    if not key_is_set():
        return jsonify({'ok': False, 'error': 'No API key set in server.py'}), 401

    try:
        resp = call_gemini({
            'contents': [{'parts': [{'text': 'Reply with just the word: WORKING'}]}],
            'generationConfig': {'maxOutputTokens': 10}
        })
        if resp.status_code == 200:
            text = resp.json()['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'ok': True, 'response': text.strip(), 'message': 'API key is working'})
        return jsonify({'ok': False, 'status': resp.status_code, 'error': resp.text[:300]}), 502
    except Exception as exc:
        return jsonify({'ok': False, 'error': str(exc)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'running',
        'vision': 'YOLOv8 food detector',
        'yolo_weights': YOLO_WEIGHTS,
        'yolo_pkg': 'installed' if YOLO is not None else 'missing',
        'yolo_loaded': 'yes' if YOLO_MODEL is not None else 'no',
        'chat_api_key': 'set' if key_is_set() else 'not set',
    })


if __name__ == '__main__':
    print('\n' + '=' * 56)
    print('  Mise AI Vision Server (YOLOv8 food detector + Gemini chat)')
    print('=' * 56)
    print('  URL:      http://localhost:5000')
    print(f'  Vision:   {YOLO_WEIGHTS} (food-only filter)')
    print('  Chat:     gemini-1.5-flash')
    print('  YOLO pkg: ' + ('installed' if YOLO is not None else 'missing'))
    if key_is_set():
        masked = GEMINI_API_KEY[:6] + '...' + GEMINI_API_KEY[-4:]
        print(f'  API Key:  SET ({masked})')
    else:
        print('  API Key:  NOT SET')
        print('  Fix: open server.py and set GEMINI_API_KEY if you want /chat')
    print('=' * 56 + '\n')
    app.run(debug=True, port=5000, host='0.0.0.0')
