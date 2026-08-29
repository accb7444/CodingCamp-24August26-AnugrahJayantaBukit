// ===========================
// DEVELOPER WORKSPACE DASHBOARD
// Vanilla JavaScript Application
// ===========================

// ===========================
// CONFIGURATION
// ===========================

/**
 * IMPORTANT: Insert your Google Gemini API Key here
 * Get your API key from: https://makersuite.google.com/app/apikey
 * The key will be stored securely in LocalStorage after first configuration
 */
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// LocalStorage Keys
const STORAGE_KEYS = {
    TASKS: 'dashboard_tasks',
    LINKS: 'dashboard_links',
    THEME: 'dashboard_theme',
    API_KEY: 'dashboard_api_key'
};

// ===========================
// STATE MANAGEMENT
// ===========================

let tasks = [];
let links = [];
let currentTheme = 'dark';
let timerInterval = null;
let timerSeconds = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;

// ===========================
// DOM ELEMENTS
// ===========================

const elements = {
    // Theme
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.querySelector('.theme-icon'),
    
    // Time & Greeting
    greeting: document.getElementById('greeting'),
    currentTime: document.getElementById('currentTime'),
    currentDate: document.getElementById('currentDate'),
    
    // Timer
    timerDisplay: document.getElementById('timerDisplay'),
    startTimer: document.getElementById('startTimer'),
    pauseTimer: document.getElementById('pauseTimer'),
    resetTimer: document.getElementById('resetTimer'),
    
    // To-Do List
    todoInput: document.getElementById('todoInput'),
    addTask: document.getElementById('addTask'),
    todoList: document.getElementById('todoList'),
    sortTasks: document.getElementById('sortTasks'),
    warningMessage: document.getElementById('warningMessage'),
    
    // API Configuration
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKey: document.getElementById('saveApiKey'),
    
    // Quick Links
    linkTitle: document.getElementById('linkTitle'),
    linkUrl: document.getElementById('linkUrl'),
    addLink: document.getElementById('addLink'),
    linksGrid: document.getElementById('linksGrid')
};

// ===========================
// INITIALIZATION
// ===========================

function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateGreetingAndTime();
    renderTasks();
    renderLinks();
    
    // Update time every second
    setInterval(updateGreetingAndTime, 1000);
}

// ===========================
// LOCAL STORAGE FUNCTIONS
// ===========================

function loadFromLocalStorage() {
    // Load tasks
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];
    
    // Load links
    const savedLinks = localStorage.getItem(STORAGE_KEYS.LINKS);
    links = savedLinks ? JSON.parse(savedLinks) : [];
    
    // Load theme
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    currentTheme = savedTheme || 'dark';
    applyTheme(currentTheme);
    
    // Load API key (masked display)
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (savedApiKey) {
        elements.apiKeyInput.value = '••••••••••••••••';
        elements.apiKeyInput.dataset.hasKey = 'true';
    }
}

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

function saveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    if (apiKey && !apiKey.includes('•')) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
        elements.apiKeyInput.value = '••••••••••••••••';
        elements.apiKeyInput.dataset.hasKey = 'true';
        showWarning('API Key saved successfully!', 'success');
    }
}

// ===========================
// THEME FUNCTIONS
// ===========================

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    elements.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    currentTheme = theme;
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
}

// ===========================
// GREETING & TIME FUNCTIONS
// ===========================

function updateGreetingAndTime() {
    const now = new Date();
    const hours = now.getHours();
    
    // Update greeting based on time
    let greetingText = 'Good Evening';
    if (hours >= 5 && hours < 12) {
        greetingText = 'Good Morning';
    } else if (hours >= 12 && hours < 18) {
        greetingText = 'Good Afternoon';
    }
    elements.greeting.textContent = greetingText;
    
    // Update current time with seconds
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
    });
    elements.currentTime.textContent = timeString;
    
    // Update current date
    const dateString = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    elements.currentDate.textContent = dateString;
}

// ===========================
// POMODORO TIMER FUNCTIONS
// ===========================

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    elements.timerDisplay.textContent = formatTime(timerSeconds);
}

function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                pauseTimer();
                alert('Pomodoro session complete! Take a break.');
            }
        }, 1000);
    }
}

function pauseTimer() {
    isTimerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 25 * 60;
    updateTimerDisplay();
}

// ===========================
// TO-DO LIST FUNCTIONS
// ===========================

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function isDuplicateTask(text) {
    return tasks.some(task => 
        task.text.toLowerCase() === text.toLowerCase() && !task.isSubtask
    );
}

function showWarning(message, type = 'warning') {
    elements.warningMessage.textContent = message;
    elements.warningMessage.classList.add('show');
    elements.warningMessage.style.backgroundColor = 
        type === 'success' ? 'var(--success-color)' : 'var(--warning-color)';
    
    setTimeout(() => {
        elements.warningMessage.classList.remove('show');
    }, 3000);
}

function addTask() {
    const text = elements.todoInput.value.trim();
    
    if (!text) {
        showWarning('Please enter a task!');
        return;
    }
    
    // Check for duplicates
    if (isDuplicateTask(text)) {
        showWarning('This task already exists!');
        return;
    }
    
    const task = {
        id: generateId(),
        text: text,
        completed: false,
        isSubtask: false,
        subtasks: []
    };
    
    tasks.push(task);
    saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
    elements.todoInput.value = '';
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
    renderTasks();
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
        renderTasks();
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const newText = prompt('Edit task:', task.text);
        if (newText && newText.trim()) {
            task.text = newText.trim();
            saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
            renderTasks();
        }
    }
}

function sortTasksArray(sortType) {
    let sortedTasks = [...tasks];
    
    switch(sortType) {
        case 'active':
            sortedTasks.sort((a, b) => a.completed - b.completed);
            break;
        case 'completed':
            sortedTasks.sort((a, b) => b.completed - a.completed);
            break;
        case 'alphabetical':
            sortedTasks.sort((a, b) => a.text.localeCompare(b.text));
            break;
        default:
            // 'all' - keep original order
            break;
    }
    
    return sortedTasks;
}

// ===========================
// AI TASK BREAKDOWN FUNCTIONS
// ===========================

async function generateSubtasks(taskId, taskText) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        showWarning('Please configure your Gemini API key first!');
        return;
    }
    
    const button = document.querySelector(`[data-task-id="${taskId}"] .ai-btn`);
    button.classList.add('loading');
    button.disabled = true;
    
    try {
        const prompt = `Break down this task into exactly 3 short, actionable sub-tasks. Task: "${taskText}". Return ONLY a JSON array of 3 strings, nothing else. Format: ["subtask 1", "subtask 2", "subtask 3"]`;
        
        const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 200
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Parse the JSON response
        let subtasks;
        try {
            // Try to extract JSON array from the response
            const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                subtasks = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON array found in response');
            }
        } catch (parseError) {
            // Fallback: split by newlines and take first 3
            subtasks = generatedText
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 3)
                .map(line => line.replace(/^[-*\d.]+\s*/, '').trim());
        }
        
        // Ensure we have exactly 3 subtasks
        if (subtasks.length < 3) {
            subtasks.push(...Array(3 - subtasks.length).fill('Additional action needed'));
        }
        subtasks = subtasks.slice(0, 3);
        
        // Add subtasks to the task
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasks = subtasks;
            saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
            renderTasks();
        }
        
    } catch (error) {
        console.error('AI Error:', error);
        showWarning('Failed to generate subtasks. Check your API key and console.');
    } finally {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// ===========================
// RENDER TASKS
// ===========================

function renderTasks() {
    const sortType = elements.sortTasks.value;
    const sortedTasks = sortTasksArray(sortType);
    
    elements.todoList.innerHTML = '';
    
    sortedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.taskId = task.id;
        
        // Main task container
        const mainDiv = document.createElement('div');
        mainDiv.className = 'todo-item-main';
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
        
        // Task text
        const textSpan = document.createElement('span');
        textSpan.className = `todo-text ${task.completed ? 'completed' : ''}`;
        textSpan.textContent = task.text;
        
        // Actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'todo-actions';
        
        // AI button (only if no subtasks yet)
        if (!task.subtasks || task.subtasks.length === 0) {
            const aiBtn = document.createElement('button');
            aiBtn.className = 'icon-btn ai-btn';
            aiBtn.innerHTML = '✨';
            aiBtn.title = 'Generate AI subtasks';
            aiBtn.addEventListener('click', () => generateSubtasks(task.id, task.text));
            actionsDiv.appendChild(aiBtn);
        }
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit task';
        editBtn.addEventListener('click', () => editTask(task.id));
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        mainDiv.appendChild(checkbox);
        mainDiv.appendChild(textSpan);
        mainDiv.appendChild(actionsDiv);
        li.appendChild(mainDiv);
        
        // Render subtasks if they exist
        if (task.subtasks && task.subtasks.length > 0) {
            const subtasksDiv = document.createElement('div');
            subtasksDiv.className = 'subtasks';
            
            task.subtasks.forEach(subtask => {
                const subtaskDiv = document.createElement('div');
                subtaskDiv.className = 'subtask-item';
                subtaskDiv.textContent = subtask;
                subtasksDiv.appendChild(subtaskDiv);
            });
            
            li.appendChild(subtasksDiv);
        }
        
        elements.todoList.appendChild(li);
    });
}

// ===========================
// QUICK LINKS FUNCTIONS
// ===========================

function addLink() {
    const title = elements.linkTitle.value.trim();
    const url = elements.linkUrl.value.trim();
    
    if (!title || !url) {
        showWarning('Please enter both title and URL!');
        return;
    }
    
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showWarning('URL must start with http:// or https://');
        return;
    }
    
    const link = {
        id: generateId(),
        title: title,
        url: url
    };
    
    links.push(link);
    saveToLocalStorage(STORAGE_KEYS.LINKS, links);
    elements.linkTitle.value = '';
    elements.linkUrl.value = '';
    renderLinks();
}

function deleteLink(id) {
    links = links.filter(link => link.id !== id);
    saveToLocalStorage(STORAGE_KEYS.LINKS, links);
    renderLinks();
}

function renderLinks() {
    elements.linksGrid.innerHTML = '';
    
    links.forEach(link => {
        const card = document.createElement('div');
        card.className = 'link-card';
        
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = link.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'link-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete link';
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            deleteLink(link.id);
        });
        
        card.appendChild(anchor);
        card.appendChild(deleteBtn);
        elements.linksGrid.appendChild(card);
    });
}

// ===========================
// EVENT LISTENERS
// ===========================

function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Timer controls
    elements.startTimer.addEventListener('click', startTimer);
    elements.pauseTimer.addEventListener('click', pauseTimer);
    elements.resetTimer.addEventListener('click', resetTimer);
    
    // API Key
    elements.saveApiKey.addEventListener('click', saveApiKey);
    elements.apiKeyInput.addEventListener('focus', function() {
        if (this.dataset.hasKey === 'true') {
            this.value = '';
            this.dataset.hasKey = 'false';
        }
    });
    
    // To-Do List
    elements.addTask.addEventListener('click', addTask);
    elements.todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    elements.sortTasks.addEventListener('change', renderTasks);
    
    // Quick Links
    elements.addLink.addEventListener('click', addLink);
    elements.linkUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addLink();
    });
}

// ===========================
// START APPLICATION
// ===========================

document.addEventListener('DOMContentLoaded', init);
