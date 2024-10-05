from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from functools import wraps
from datetime import datetime
from clerk_backend_api import Clerk
import os
import uuid

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.getenv("CLIENT_URL")}}, supports_credentials=True)

# MongoDB setup
client = MongoClient(os.getenv("MONGO"))
db = client.get_database('GenCraft')
chats_collection = db['chats']
user_chats_collection = db['userChats']

# Clerk setup for authentication
clerk = Clerk()

# File upload configuration
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Custom decorator for Clerk authentication
def clerk_require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            token = request.headers.get('Authorization')
            if not token:
                return jsonify({"error": "No authorization token provided"}), 401
            
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify the token using clerk_backend_api
            session = clerk.sessions.verify_token(token)
            request.clerk_user = session
        except Exception as e:
            return jsonify({"error": str(e)}), 401
        return f(*args, **kwargs)
    return decorated_function

# Simple function to simulate an AI response
def generate_response(user_input):
    # Replace this with actual AI response generation
    return f"This is an AI response to: {user_input}"

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path or 'index.html')

# Create new chat with user input and AI response
@app.route('/api/chats', methods=['POST'])
@clerk_require_auth
def create_chat():
    user_id = request.clerk_user.id
    data = request.json  # Get user input in JSON format
    text = data.get('text')
    
    # Generate AI response
    ai_response = generate_response(text)
    
    # Save chat history with both user and AI parts
    new_chat = {
        "userId": user_id,
        "history": [
            {"role": "user", "parts": [{"text": text}]},
            {"role": "ai", "parts": [{"text": ai_response}]}
        ]
    }
    inserted_chat = chats_collection.insert_one(new_chat)

    # Update user chat list
    user_chats = user_chats_collection.find_one({"userId": user_id})
    if user_chats is None:
        new_user_chats = {
            "userId": user_id,
            "chats": [{"_id": inserted_chat.inserted_id, "title": text[:40]}]
        }
        user_chats_collection.insert_one(new_user_chats)
    else:
        user_chats_collection.update_one(
            {"userId": user_id},
            {"$push": {"chats": {"_id": inserted_chat.inserted_id, "title": text[:40]}}}
        )

    return jsonify({"chatId": str(inserted_chat.inserted_id), "response": ai_response}), 201

# Update an existing chat with new user input and AI response
@app.route('/api/chats/<chat_id>', methods=['PUT'])
@clerk_require_auth
def update_chat(chat_id):
    user_id = request.clerk_user.id
    data = request.json
    question = data.get('question')

    # Generate AI response for the new question
    ai_response = generate_response(question)

    # Add new user input and AI response to the chat history
    new_items = [
        {"role": "user", "parts": [{"text": question}]},
        {"role": "ai", "parts": [{"text": ai_response}]}
    ]

    try:
        result = chats_collection.update_one(
            {"_id": ObjectId(chat_id), "userId": user_id},
            {"$push": {"history": {"$each": new_items}}}
        )

        if result.matched_count > 0:
            return jsonify({"message": "Chat updated successfully", "response": ai_response}), 200
        else:
            return jsonify({"message": "Chat not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Get all user chats
@app.route('/api/userchats', methods=['GET'])
@clerk_require_auth
def get_user_chats():
    user_id = request.clerk_user.id
    user_chats = user_chats_collection.find_one({"userId": user_id})
    if user_chats:
        for chat in user_chats["chats"]:
            chat["_id"] = str(chat["_id"])
        return jsonify(user_chats["chats"]), 200
    else:
        return jsonify({"message": "No chats found"}), 404

# Get a specific chat
@app.route('/api/chats/<chat_id>', methods=['GET'])
@clerk_require_auth
def get_chat(chat_id):
    user_id = request.clerk_user.id
    try:
        chat = chats_collection.find_one({"_id": ObjectId(chat_id), "userId": user_id})
        if chat:
            chat['_id'] = str(chat['_id'])
            return jsonify(chat), 200
        else:
            return jsonify({"message": "Chat not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Delete a chat
@app.route('/api/chats/<chat_id>', methods=['DELETE'])
@clerk_require_auth
def delete_chat(chat_id):
    user_id = request.clerk_user.id
    try:
        result = chats_collection.delete_one({"_id": ObjectId(chat_id), "userId": user_id})
        if result.deleted_count > 0:
            user_chats_collection.update_one(
                {"userId": user_id},
                {"$pull": {"chats": {"_id": ObjectId(chat_id)}}}
            )
            return jsonify({"message": "Chat deleted successfully"}), 200
        else:
            return jsonify({"message": "Chat not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
