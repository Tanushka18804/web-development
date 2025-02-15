from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, send, emit
from flask_cors import CORS
from pymongo import MongoClient
import uuid

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client["collab_doc"]
documents = db["documents"]
users = db["users"]

@app.route("/save", methods=["POST"])
def save_document():
    data = request.get_json()
    document_id = data.get("documentId")
    content = data.get("content")
    
    documents.update_one({"documentId": document_id}, {"$set": {"content": content}}, upsert=True)
    return jsonify({"message": "Document saved successfully!"}), 200

@app.route("/documents", methods=["GET"])
def get_documents():
    docs = documents.find({}, {"_id": 0})
    return jsonify(list(docs)), 200

@socketio.on("join-document")
def join_document(data):
    document_id = data["documentId"]
    user_id = data.get("userId", str(uuid.uuid4()))
    username = data.get("username", "Anonymous")
    join_room(document_id)
    
    users.update_one({"userId": user_id}, {"$set": {"username": username}}, upsert=True)
    user_list = list(users.find({}, {"_id": 0, "username": 1}))
    socketio.emit("user-list", user_list, room=document_id)
    
    document = documents.find_one({"documentId": document_id})
    if document:
        emit("document-content", document["content"], room=document_id)

@socketio.on("update-document")
def update_document(data):
    document_id = data["documentId"]
    content = data["content"]
    documents.update_one({"documentId": document_id}, {"$set": {"content": content}}, upsert=True)
    emit("document-content", content, room=document_id)

@socketio.on("leave-document")
def leave_document(data):
    document_id = data["documentId"]
    user_id = data["userId"]
    leave_room(document_id)
    users.delete_one({"userId": user_id})
    user_list = list(users.find({}, {"_id": 0, "username": 1}))
    socketio.emit("user-list", user_list, room=document_id)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
