from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory storage for tasks (in production, use a database)
tasks = []
next_id = 1

# File to persist tasks
TASKS_FILE = 'tasks.json'

def load_tasks():
    """Load tasks from file"""
    global tasks, next_id
    if os.path.exists(TASKS_FILE):
        try:
            with open(TASKS_FILE, 'r') as f:
                data = json.load(f)
                tasks = data.get('tasks', [])
                next_id = data.get('next_id', 1)
        except (json.JSONDecodeError, FileNotFoundError):
            tasks = []
            next_id = 1

def save_tasks():
    """Save tasks to file"""
    try:
        with open(TASKS_FILE, 'w') as f:
            json.dump({
                'tasks': tasks,
                'next_id': next_id
            }, f, indent=2)
    except Exception as e:
        print(f"Error saving tasks: {e}")

# Load tasks on startup
load_tasks()

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks"""
    try:
        return jsonify({
            'success': True,
            'tasks': tasks
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks', methods=['POST'])
def add_task():
    """Add a new task"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Task text is required'
            }), 400
        
        task_text = data['text'].strip()
        if not task_text:
            return jsonify({
                'success': False,
                'error': 'Task text cannot be empty'
            }), 400
        
        global next_id
        new_task = {
            'id': next_id,
            'text': task_text,
            'completed': False,
            'created_at': datetime.now().isoformat()
        }
        
        tasks.append(new_task)
        next_id += 1
        save_tasks()
        
        return jsonify({
            'success': True,
            'task': new_task
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task (mark as completed/incomplete)"""
    try:
        data = request.get_json()
        
        # Find the task
        task = None
        for t in tasks:
            if t['id'] == task_id:
                task = t
                break
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        # Update task properties
        if 'completed' in data:
            task['completed'] = bool(data['completed'])
        if 'text' in data:
            task['text'] = data['text'].strip()
        
        task['updated_at'] = datetime.now().isoformat()
        save_tasks()
        
        return jsonify({
            'success': True,
            'task': task
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    try:
        global tasks
        original_length = len(tasks)
        tasks = [task for task in tasks if task['id'] != task_id]
        
        if len(tasks) == original_length:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        save_tasks()
        
        return jsonify({
            'success': True,
            'message': 'Task deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'Server is running',
        'tasks_count': len(tasks)
    }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    print("Starting To-Do List API server...")
    print("Available endpoints:")
    print("- GET /api/tasks - Get all tasks")
    print("- POST /api/tasks - Add new task")
    print("- PUT /api/tasks/<id> - Update task")
    print("- DELETE /api/tasks/<id> - Delete task")
    print("- GET /api/health - Health check")
    app.run(debug=True, host='0.0.0.0', port=5000)
