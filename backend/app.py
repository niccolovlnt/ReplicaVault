import os
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import uuid
import shutil

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']       = os.environ.get('JWT_SECRET_KEY')
app.config['STORAGE_PATH']         = '/app/uploads'
app.config['USER_QUOTA_BYTES']     = int(os.environ.get('USER_QUOTA_BYTES', 1073741824))  # default 1 GB

# Initialize database
db = SQLAlchemy(app)

# Define User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# JWT token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            token = auth_header.split(' ')[1] if len(auth_header.split(' ')) > 1 else None
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated

# Create database tables
with app.app_context():
    db.create_all()
    
# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists!'}), 409
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists!'}), 409
    
    # Hash the password
    hashed_password = generate_password_hash(data['password'], method='sha256')
    
    # Create new user
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # Create user directory in GlusterFS
    user_dir = os.path.join(app.config['STORAGE_PATH'], data['username'])
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)
    
    return jsonify({'message': 'User registered successfully!'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Could not verify'}), 401
    
    user = User.query.filter_by(username=data['username']).first()
    
    if not user:
        return jsonify({'message': 'User not found!'}), 404
    
    if check_password_hash(user.password, data['password']):
        # Generate token
        token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'token': token,
            'username': user.username,
            'email': user.email,
            'userId': user.id
        }), 200
    
    return jsonify({'message': 'Invalid credentials!'}), 401

@app.route('/api/files', methods=['GET'])
@token_required
def get_files(current_user):
    user_dir = os.path.join(app.config['STORAGE_PATH'], current_user.username)
    
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)
    
    files = []
    for item in os.listdir(user_dir):
        item_path = os.path.join(user_dir, item)
        if os.path.isfile(item_path):
            files.append({
                'name': item,
                'size': os.path.getsize(item_path),
                'modified': datetime.datetime.fromtimestamp(os.path.getmtime(item_path)).strftime('%Y-%m-%d %H:%M:%S')
            })
    
    return jsonify({'files': files}), 200

@app.route('/api/files', methods=['POST'])
@token_required
def upload_file(current_user):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected for uploading'}), 400

    user_dir = os.path.join(app.config['STORAGE_PATH'], current_user.username)
    os.makedirs(user_dir, exist_ok=True)

    # 1) compute already used bytes
    used = sum(
        os.path.getsize(os.path.join(user_dir, f))
        for f in os.listdir(user_dir)
        if os.path.isfile(os.path.join(user_dir, f))
    )

    # 2) measure incoming file size
    file.stream.seek(0, os.SEEK_END)
    incoming = file.stream.tell()
    file.stream.seek(0)

    # 3) enforce quota
    if used + incoming > app.config['USER_QUOTA_BYTES']:
        return jsonify({
          'message': 'Storage quota exceeded',
          'quota_bytes': app.config['USER_QUOTA_BYTES'],
          'used_bytes': used
        }), 413

    # 4) save
    file_path = os.path.join(user_dir, file.filename)
    file.save(file_path)
    return jsonify({'message': 'File uploaded successfully!'}), 201

@app.route('/api/files/<filename>', methods=['GET'])
@token_required
def download_file(current_user, filename):
    user_dir = os.path.join(app.config['STORAGE_PATH'], current_user.username)
    
    return send_from_directory(user_dir, filename, as_attachment=True)

@app.route('/api/files/<filename>', methods=['DELETE'])
@token_required
def delete_file(current_user, filename):
    user_dir = os.path.join(app.config['STORAGE_PATH'], current_user.username)
    file_path = os.path.join(user_dir, filename)
    
    if not os.path.exists(file_path):
        return jsonify({'message': 'File not found!'}), 404
    
    os.remove(file_path)
    
    return jsonify({'message': 'File deleted successfully!'}), 200

@app.route('/api/user', methods=['GET'])
@token_required
def get_user_info(current_user):
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'created_at': current_user.created_at
    }), 200

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)