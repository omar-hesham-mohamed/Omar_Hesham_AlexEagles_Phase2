// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const tasksList = document.getElementById('tasks-list');
const themeToggle = document.getElementById('theme-toggle');
const totalTasksSpan = document.getElementById('total-tasks');
const completedTasksSpan = document.getElementById('completed-tasks');
const loadingDiv = document.getElementById('loading');

// State
let tasks = [];
let isDarkMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Load theme from localStorage
    loadTheme();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load tasks from server
    await loadTasks();
    
    // Update UI
    updateTaskStats();
}

function setupEventListeners() {
    // Add task button
    addTaskBtn.addEventListener('click', addTask);
    
    // Enter key in input field
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Input validation
    taskInput.addEventListener('input', function() {
        const value = this.value.trim();
        addTaskBtn.disabled = value.length === 0;
    });
}

// Theme Management
function toggleTheme() {
    isDarkMode = !isDarkMode;
    const body = document.body;
    
    if (isDarkMode) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️ Light Mode';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeToggle.textContent = '🌙 Dark Mode';
    }
    
    // Save theme preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    isDarkMode = savedTheme === 'dark';
    
    const body = document.body;
    if (isDarkMode) {
        body.classList.add('dark-theme');
        themeToggle.textContent = '☀️ Light Mode';
    } else {
        body.classList.add('light-theme');
        themeToggle.textContent = '🌙 Dark Mode';
    }
}

// Task Management
async function addTask() {
    const taskText = taskInput.value.trim();
    
    if (!taskText) {
        showMessage('Please enter a task!', 'error');
        return;
    }
    
    if (taskText.length > 200) {
        showMessage('Task text is too long (max 200 characters)!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: taskText })
        });
        
        const data = await response.json();
        
        if (data.success) {
            tasks.push(data.task);
            renderTasks();
            updateTaskStats();
            taskInput.value = '';
            addTaskBtn.disabled = true;
            showMessage('Task added successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to add task', 'error');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showMessage('Failed to connect to server. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadTasks() {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/tasks`);
        const data = await response.json();
        
        if (data.success) {
            tasks = data.tasks;
            renderTasks();
            updateTaskStats();
        } else {
            showMessage(data.error || 'Failed to load tasks', 'error');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showMessage('Failed to connect to server. Loading from localStorage...', 'error');
        loadTasksFromLocalStorage();
    } finally {
        showLoading(false);
    }
}

async function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: !task.completed })
        });
        
        const data = await response.json();
        
        if (data.success) {
            task.completed = data.task.completed;
            renderTasks();
            updateTaskStats();
            saveTasksToLocalStorage();
        } else {
            showMessage(data.error || 'Failed to update task', 'error');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showMessage('Failed to connect to server. Using local storage...', 'error');
        task.completed = !task.completed;
        renderTasks();
        updateTaskStats();
        saveTasksToLocalStorage();
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            tasks = tasks.filter(t => t.id !== taskId);
            renderTasks();
            updateTaskStats();
            saveTasksToLocalStorage();
            showMessage('Task deleted successfully!', 'success');
        } else {
            showMessage(data.error || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showMessage('Failed to connect to server. Using local storage...', 'error');
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateTaskStats();
        saveTasksToLocalStorage();
    }
}

// UI Rendering
function renderTasks() {
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks yet!</h3>
                <p>Add your first task above to get started.</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <input type="checkbox" 
                   class="task-checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="toggleTaskCompletion(${task.id})">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-actions">
                <button class="delete-btn" onclick="deleteTask(${task.id})" title="Delete task">
                    🗑️ Delete
                </button>
            </div>
        </li>
    `).join('');
}

function updateTaskStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    
    totalTasksSpan.textContent = total;
    completedTasksSpan.textContent = completed;
}

// Local Storage (Fallback)
function saveTasksToLocalStorage() {
    try {
        localStorage.setItem('todo-tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadTasksFromLocalStorage() {
    try {
        const savedTasks = localStorage.getItem('todo-tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            renderTasks();
            updateTaskStats();
            showMessage('Loaded tasks from local storage', 'success');
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        showMessage('Failed to load tasks from local storage', 'error');
    }
}

// Utility Functions
function showLoading(show) {
    loadingDiv.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.error-message, .success-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    
    // Insert after the add task section
    const addTaskSection = document.querySelector('.add-task-section');
    addTaskSection.insertAdjacentElement('afterend', messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-save to localStorage every 30 seconds
setInterval(() => {
    if (tasks.length > 0) {
        saveTasksToLocalStorage();
    }
}, 30000);

// Handle page visibility change (save when tab becomes hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && tasks.length > 0) {
        saveTasksToLocalStorage();
    }
});

// Handle beforeunload (save when page is about to be closed)
window.addEventListener('beforeunload', () => {
    if (tasks.length > 0) {
        saveTasksToLocalStorage();
    }
});
