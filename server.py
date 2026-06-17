"""
Mise AI — Vision Server  (Google Gemini REST API)
==================================================
Install:  pip install flask flask-cors Pillow requests
Run:      python server.py
Open:     http://localhost:5000

Get your FREE Gemini API key at:
  https://aistudio.google.com/app/apikey
  (key format: AQ.Ab8RN6... or AIzaSy...)
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import base64
import json
import os
import re
import io
import requests  # pure HTTP — no SDK needed

app = Flask(__name__, static_folder='.')
CORS(app)

# ═══════════════════════════════════════════════════════════
#  PASTE YOUR GEMINI API KEY HERE  (between the quotes)
#  Both key formats work:  AQ.Ab8RN6...  OR  AIzaSy...
#  Get a free key: https://aistudio.google.com/app/apikey
# ═══════════════════════════════════════════════════════════
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AQ.Ab8RN6K0P41D5vWbNdp7LkYhTGl9BDhuRPWUjJFhR9bVr9_IiA')
# ═══════════════════════════════════════════════════════════

# Gemini REST endpoint — works with both AQ.Ab8... and AIzaSy... key formats
# Using gemini-1.5-flash which is the stable free model
GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

FOOD_PROMPT = """You are Mise AI, an expert food recognition and culinary AI system.

Analyse this image carefully. Identify ALL food items visible.
Return ONLY valid JSON — no markdown fences, no extra text, nothing else.

Use exactly this structure:
{
  "detected": true,
  "scene": "One sentence describing the overall food scene",
  "foods": [
    {
      "name": "Jollof Rice",
      "confidence": 95,
      "cuisine": "West African",
      "calories_per_100g": 185,
      "description": "A rich, flavourful one-pot rice dish cooked in a seasoned tomato base.",
      "macros": { "protein": "4g", "carbs": "36g", "fat": "4g", "fiber": "1g" },
      "key_nutrients": ["Iron", "Vitamin B6", "Folate"],
      "ingredients": ["long-grain rice", "tomatoes", "red pepper", "onions", "palm oil", "seasoning cubes", "chicken stock"],
      "box": { "x": 10, "y": 15, "w": 80, "h": 70 }
    }
  ],
  "recipe_title": "Classic Jollof Rice",
  "recipe_steps": [
    "Blend tomatoes, red peppers and onions into a smooth paste.",
    "Fry the blended paste in palm oil until the water dries out and oil floats on top.",
    "Add chicken stock, seasoning cubes, and salt to taste.",
    "Wash and add rice, stir to combine, then cover and cook on low heat.",
    "Stir every 10 minutes until rice is cooked and sauce is absorbed."
  ],
  "cooking_time": "45 minutes",
  "difficulty": "Medium"
}

If NO food is detected:
{ "detected": false, "message": "Brief description of what you see instead" }

Rules:
- box values are percentage positions (0-100) of the food within the image
- confidence is 0-100
- Always return raw JSON only"""


def key_is_set():
    k = (GEMINI_API_KEY or '').strip()
    return len(k) > 10 and k not in ('PASTE_YOUR_KEY_HERE', 'YOUR_KEY_HERE', '')


def call_gemini(payload):
    """
    Makes a REST call to Gemini using X-goog-api-key header.
    Works with both AQ.Ab8... and AIzaSy... key formats.
    """
    resp = requests.post(
        GEMINI_URL,
        headers={
            'Content-Type':   'application/json',
            'X-goog-api-key': GEMINI_API_KEY.strip(),
        },
        json=payload,
        timeout=30
    )
    return resp


# ══════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory('.', 'mise_ai_vision.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Accepts:  { "image": "<base64>", "mime": "image/jpeg" }
    Returns:  food recognition JSON
    """
    if not key_is_set():
        return jsonify({
            'detected': False,
            'error': 'No API key set. Open server.py and paste your key into GEMINI_API_KEY.'
        }), 401

    try:
        data      = request.get_json(force=True)
        image_b64 = data.get('image', '').strip()
        mime_type = data.get('mime', 'image/jpeg')

        if not image_b64:
            return jsonify({'detected': False, 'error': 'No image data received'}), 400

        # Resize image to reduce payload (max 1024px on longest side)
        img_bytes = base64.b64decode(image_b64)
        img       = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        max_dim   = 1024
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            img   = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        image_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        mime_type = 'image/jpeg'

        # Build Gemini REST payload
        payload = {
            'contents': [{
                'parts': [
                    { 'text': FOOD_PROMPT },
                    {
                        'inline_data': {
                            'mime_type': mime_type,
                            'data':      image_b64
                        }
                    }
                ]
            }],
            'generationConfig': {
                'temperature':     0.2,
                'maxOutputTokens': 1500,
            }
        }

        resp = call_gemini(payload)

        if resp.status_code != 200:
            print(f'[/analyze] Gemini error {resp.status_code}:', resp.text[:300])
            return jsonify({
                'detected': False,
                'error': f'Gemini API error {resp.status_code}: {resp.text[:200]}'
            }), 502

        # Extract text from response
        gemini_data = resp.json()
        raw = gemini_data['candidates'][0]['content']['parts'][0]['text'].strip()

        # Strip markdown fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\s*```$',          '', raw, flags=re.MULTILINE)
        raw = raw.strip()

        result = json.loads(raw)
        return jsonify(result)

    except json.JSONDecodeError as je:
        print('[/analyze] JSON parse error:', je)
        print('[/analyze] Raw response:', locals().get('raw', 'N/A'))
        return jsonify({'detected': False, 'error': 'Could not parse AI response — try again'}), 500

    except Exception as e:
        print('[/analyze] Unexpected error:', e)
        return jsonify({'detected': False, 'error': str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat():
    """
    Accepts:  { "messages": [...], "system": "..." }
    Returns:  { "reply": "..." }
    """
    if not key_is_set():
        return jsonify({'error': 'No API key set in server.py'}), 401

    try:
        data     = request.get_json(force=True)
        messages = data.get('messages', [])
        system   = data.get('system', (
            'You are Mise AI Chef, a warm and knowledgeable culinary assistant. '
            'Help with cooking, recipes, Nigerian and West African cuisine, '
            'substitutions, and meal planning. Keep replies friendly and concise.'
        ))

        if not messages:
            return jsonify({'error': 'No messages provided'}), 400

        # Build Gemini contents array — roles: 'user' or 'model'
        contents = []
        for msg in messages:
            role    = msg.get('role', 'user')
            content = msg.get('content', '').strip()
            if not content:
                continue
            gemini_role = 'model' if role == 'assistant' else 'user'
            # Merge consecutive same-role messages
            if contents and contents[-1]['role'] == gemini_role:
                contents[-1]['parts'][0]['text'] += '\n' + content
            else:
                contents.append({'role': gemini_role, 'parts': [{'text': content}]})

        # Must start with user
        while contents and contents[0]['role'] != 'user':
            contents.pop(0)

        if not contents:
            return jsonify({'error': 'No valid user messages'}), 400

        # Prepend system prompt to first user message
        contents[0]['parts'][0]['text'] = system + '\n\n' + contents[0]['parts'][0]['text']

        payload = {
            'contents': contents,
            'generationConfig': {
                'temperature':     0.7,
                'maxOutputTokens': 600,
            }
        }

        resp = call_gemini(payload)

        if resp.status_code != 200:
            print(f'[/chat] Gemini error {resp.status_code}:', resp.text[:300])
            return jsonify({'error': f'Gemini error {resp.status_code}'}), 502

        reply = resp.json()['candidates'][0]['content']['parts'][0]['text']
        return jsonify({'reply': reply})

    except Exception as e:
        print('[/chat] Error:', e)
        return jsonify({'error': str(e)}), 500


@app.route('/test', methods=['GET'])
def test_key():
    """Quick test — visit http://localhost:5000/test to verify your API key works"""
    if not key_is_set():
        return jsonify({'ok': False, 'error': 'No API key set in server.py'}), 401
    try:
        resp = call_gemini({
            'contents': [{'parts': [{'text': 'Reply with just the word: WORKING'}]}],
            'generationConfig': {'maxOutputTokens': 10}
        })
        if resp.status_code == 200:
            text = resp.json()['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'ok': True, 'response': text.strip(), 'message': 'API key is working ✓'})
        else:
            return jsonify({'ok': False, 'status': resp.status_code, 'error': resp.text[:300]}), 502
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    key_ok = key_is_set()
    gemini_ok = False
    if key_ok:
        try:
            test = call_gemini({
                'contents': [{'parts': [{'text': 'say ok'}]}],
                'generationConfig': {'maxOutputTokens': 5}
            })
            gemini_ok = test.status_code == 200
        except Exception:
            pass
    return jsonify({
        'status':       'running',
        'api_key':      'set ✓' if key_ok else 'NOT SET ✗',
        'gemini_reach': 'ok ✓'  if gemini_ok else 'failed ✗',
        'model':        'gemini-1.5-flash',
        'key_format':   'REST (X-goog-api-key)',
    })


# ══════════════════════════════════════════════════════════
#  STARTUP
# ══════════════════════════════════════════════════════════
if __name__ == '__main__':
    print('\n' + '═' * 52)
    print('  🍊  Mise AI Vision Server  (Gemini Edition)')
    print('═' * 52)
    print(f'  URL:      http://localhost:5000')
    print(f'  Model:    gemini-1.5-flash')
    print(f'  Method:   REST API (X-goog-api-key)')
    if key_is_set():
        masked = GEMINI_API_KEY[:6] + '...' + GEMINI_API_KEY[-4:]
        print(f'  API Key:  SET ✓  ({masked})')
    else:
        print(f'  API Key:  ✗ NOT SET')
        print(f'')
        print(f'  Fix: open server.py → paste key into GEMINI_API_KEY')
        print(f'  Free key: https://aistudio.google.com/app/apikey')
    print('═' * 52 + '\n')
    app.run(debug=True, port=5000, host='0.0.0.0')
