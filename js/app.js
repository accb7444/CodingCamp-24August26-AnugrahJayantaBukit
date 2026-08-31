// ===========================
// DEVELOPER WORKSPACE DASHBOARD
// Vanilla JavaScript Application
// ===========================

// ===========================
// CONFIGURATION
// ===========================

/**
 * AI Provider Configuration
 * Supports: Google Gemini, OpenRouter, and Custom OpenAI-compatible endpoints
 */
const API_PROVIDERS = {
    gemini: {
        name: 'Google Gemini',
        defaultModel: 'gemini-pro',
        getEndpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        buildRequest: (prompt, apiKey) => ({
            url: API_PROVIDERS.gemini.getEndpoint(getModelName()),
            options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
                })
            },
            params: `?key=${apiKey}`
        }),
        parseResponse: (data) => data.candidates[0].content.parts[0].text
    },
    openrouter: {
        name: 'OpenRouter',
        defaultModel: 'google/gemini-2.0-flash-001',
        getEndpoint: () => 'https://openrouter.ai/api/v1/chat/completions',
        buildRequest: (prompt, apiKey) => ({
            url: API_PROVIDERS.openrouter.getEndpoint(),
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Developer Dashboard'
                },
                body: JSON.stringify({
                    model: getModelName(),
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 200
                })
            },
            params: ''
        }),
        parseResponse: (data) => data.choices[0].message.content
    },
    custom: {
        name: 'Custom (OpenAI-compatible)',
        defaultModel: '',
        getEndpoint: () => getCustomEndpoint(),
        buildRequest: (prompt, apiKey) => ({
            url: getCustomEndpoint(),
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: getModelName(),
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 200
                })
            },
            params: ''
        }),
        parseResponse: (data) => data.choices[0].message.content
    }
};

// LocalStorage Keys
const STORAGE_KEYS = {
    TASKS: 'dashboard_tasks',
    LINKS: 'dashboard_links',
    THEME: 'dashboard_theme',
    API_KEY: 'dashboard_api_key',
    API_PROVIDER: 'dashboard_api_provider',
    MODEL_NAME: 'dashboard_model_name',
    CUSTOM_ENDPOINT: 'dashboard_custom_endpoint',
    TIMER_DURATION: 'dashboard_timer_duration'
};

// ===========================
// STATE MANAGEMENT
// ===========================

let tasks = [];
let links = [];
let currentTheme = 'dark';
let timerInterval = null;
let defaultTimerMinutes = 25;
let timerSeconds = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;
let currentProvider = 'gemini';

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
    customMinutes: document.getElementById('customMinutes'),
    setCustomTime: document.getElementById('setCustomTime'),
    presetBtns: document.querySelectorAll('.preset-btn[data-minutes]'),
    
    // To-Do List
    todoInput: document.getElementById('todoInput'),
    addTask: document.getElementById('addTask'),
    todoList: document.getElementById('todoList'),
    sortTasks: document.getElementById('sortTasks'),
    warningMessage: document.getElementById('warningMessage'),
    
    // API Configuration
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKey: document.getElementById('saveApiKey'),
    apiProvider: document.getElementById('apiProvider'),
    modelNameInput: document.getElementById('modelNameInput'),
    customEndpointInput: document.getElementById('customEndpointInput'),
    customEndpointRow: document.getElementById('customEndpointRow'),
    modelNameRow: document.getElementById('modelNameRow'),
    
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
    
    // Load API provider
    const savedProvider = localStorage.getItem(STORAGE_KEYS.API_PROVIDER);
    if (savedProvider) {
        currentProvider = savedProvider;
        elements.apiProvider.value = savedProvider;
    }
    
    // Load model name
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL_NAME);
    if (savedModel) {
        elements.modelNameInput.value = savedModel;
    } else {
        elements.modelNameInput.value = API_PROVIDERS[currentProvider].defaultModel;
    }
    
    // Load custom endpoint
    const savedEndpoint = localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT);
    if (savedEndpoint) {
        elements.customEndpointInput.value = savedEndpoint;
    }
    
    // Load timer duration
    const savedDuration = localStorage.getItem(STORAGE_KEYS.TIMER_DURATION);
    if (savedDuration) {
        defaultTimerMinutes = parseInt(savedDuration, 10);
        timerSeconds = defaultTimerMinutes * 60;
        updateTimerDisplay();
        updatePresetButtons(defaultTimerMinutes);
    }
    
    // Update provider UI
    updateProviderUI();
}

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

function getModelName() {
    return localStorage.getItem(STORAGE_KEYS.MODEL_NAME) || API_PROVIDERS[currentProvider].defaultModel;
}

function getCustomEndpoint() {
    return localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT) || '';
}

function updateProviderUI() {
    const isCustom = currentProvider === 'custom';
    elements.customEndpointRow.style.display = isCustom ? 'flex' : 'none';
    
    // Update placeholder based on provider
    const placeholders = {
        gemini: 'Model name (e.g. gemini-pro, gemini-1.5-flash)',
        openrouter: 'Model name (e.g. google/gemini-2.0-flash-001, openai/gpt-4o)',
        custom: 'Model name (e.g. gpt-4o, llama-3.1-70b)'
    };
    elements.modelNameInput.placeholder = placeholders[currentProvider] || '';
}

function saveApiConfig() {
    // Save API key
    const apiKey = elements.apiKeyInput.value.trim();
    if (apiKey && !apiKey.includes('•')) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
        elements.apiKeyInput.value = '••••••••••••••••';
        elements.apiKeyInput.dataset.hasKey = 'true';
    }
    
    // Save provider
    currentProvider = elements.apiProvider.value;
    localStorage.setItem(STORAGE_KEYS.API_PROVIDER, currentProvider);
    
    // Save model name
    const modelName = elements.modelNameInput.value.trim();
    if (modelName) {
        localStorage.setItem(STORAGE_KEYS.MODEL_NAME, modelName);
    }
    
    // Save custom endpoint
    if (currentProvider === 'custom') {
        const endpoint = elements.customEndpointInput.value.trim();
        if (endpoint) {
            localStorage.setItem(STORAGE_KEYS.CUSTOM_ENDPOINT, endpoint);
        }
    }
    
    showWarning('AI configuration saved successfully!', 'success');
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
    timerSeconds = defaultTimerMinutes * 60;
    updateTimerDisplay();
}

function setTimerDuration(minutes) {
    pauseTimer();
    defaultTimerMinutes = minutes;
    timerSeconds = minutes * 60;
    localStorage.setItem(STORAGE_KEYS.TIMER_DURATION, minutes.toString());
    updateTimerDisplay();
    updatePresetButtons(minutes);
}

function updatePresetButtons(minutes) {
    elements.presetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes, 10) === minutes);
    });
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
        type === 'success' ? 'var(--success-color)' : 
        type === 'error' ? 'var(--danger-color)' : 'var(--warning-color)';
    
    // Longer display for errors so users can read the details
    const duration = type === 'error' ? 8000 : 3000;
    setTimeout(() => {
        elements.warningMessage.classList.remove('show');
    }, duration);
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
// API ERROR HANDLING
// ===========================

/**
 * Parses API error responses and returns a user-friendly message.
 * Handles OpenRouter-specific errors (rate limits, provider failures, etc.),
 * Gemini errors, and generic HTTP errors.
 */
function parseApiError(status, errorBody) {
    let errorData;
    try {
        errorData = JSON.parse(errorBody);
    } catch {
        // Not JSON, return generic message
        return `API Error (${status}): ${errorBody.substring(0, 100)}`;
    }

    const error = errorData.error || errorData;
    const code = error.code || status;
    const message = error.message || '';
    const metadata = error.metadata || {};
    const providerErrorCode = metadata.provider_error_code || '';
    const remedyHint = metadata.remedy_hint || '';
    const retryAfter = metadata.retry_after_seconds || '';
    const raw = metadata.raw || '';

    // OpenRouter-specific error handling
    if (currentProvider === 'openrouter') {
        // Rate limiting (429)
        if (code === 429 || status === 429) {
            if (providerErrorCode === 'upstream_429') {
                let msg = `⏳ Rate limited by the upstream provider. `;
                if (retryAfter) {
                    msg += `Retry in ${retryAfter}s. `;
                }
                msg += remedyHint ? remedyHint.replace(/https?:\/\/\S+/g, '').trim() : 'Try again shortly or switch to a different model.';
                return msg;
            }
            let msg = `⏳ Rate limited. `;
            if (retryAfter) msg += `Retry in ${retryAfter}s. `;
            msg += 'Wait a moment and try again.';
            return msg;
        }

        // Authentication error (401)
        if (code === 401 || status === 401) {
            return '🔑 Invalid API key. Please check your OpenRouter API key and save again.';
        }

        // Insufficient credits (402)
        if (code === 402 || status === 402) {
            return '💳 Insufficient credits on your OpenRouter account. Add credits at openrouter.ai/credits.';
        }

        // Content moderation / forbidden (403)
        if (code === 403 || status === 403) {
            return '🚫 Request blocked by content moderation. Try rephrasing the task.';
        }

        // Model not found (404)
        if (code === 404 || status === 404) {
            const modelName = getModelName();
            return `❌ Model "${modelName}" not found on OpenRouter. Check the model name and try again.`;
        }

        // Request timeout (408/504)
        if (code === 408 || code === 504 || status === 408 || status === 504) {
            return '⌛ Request timed out. The model took too long to respond. Try a faster model or try again.';
        }

        // Provider error (502/503)
        if (code === 502 || code === 503 || status === 502 || status === 503) {
            const providerName = metadata.provider_name || 'The provider';
            return `⚠️ ${providerName} is temporarily unavailable. Try again shortly or switch to a different model.`;
        }

        // Generic OpenRouter error with remedy hint
        if (remedyHint) {
            return `⚠️ ${message}. Hint: ${remedyHint.replace(/https?:\/\/\S+/g, '').trim()}`;
        }
    }

    // Gemini-specific errors
    if (currentProvider === 'gemini') {
        if (status === 400) {
            if (message.toLowerCase().includes('api key')) {
                return '🔑 Invalid Gemini API key. Please check your key and save again.';
            }
            return `⚠️ Bad request: ${message.substring(0, 100)}`;
        }
        if (status === 403) {
            return '🔑 Gemini API key is invalid or does not have access. Check your key at makersuite.google.com.';
        }
        if (status === 429) {
            return '⏳ Gemini rate limit hit. Wait a moment and try again.';
        }
    }

    // Generic fallback
    if (message) {
        return `⚠️ Error ${status}: ${message.substring(0, 120)}`;
    }
    return `⚠️ API Error (${status}). Check the browser console for details.`;
}

// ===========================
// AI TASK BREAKDOWN FUNCTIONS
// ===========================

async function generateSubtasks(taskId, taskText) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        showWarning('Please configure your API key first!');
        return;
    }
    
    const provider = API_PROVIDERS[currentProvider];
    if (!provider) {
        showWarning('Invalid API provider selected!');
        return;
    }
    
    // Validate custom endpoint
    if (currentProvider === 'custom' && !getCustomEndpoint()) {
        showWarning('Please enter a custom API endpoint URL!');
        return;
    }
    
    const button = document.querySelector(`[data-task-id="${taskId}"] .ai-btn`);
    button.classList.add('loading');
    button.disabled = true;
    
    try {
        const prompt = `Break down this task into exactly 3 short, actionable sub-tasks. Task: "${taskText}". Return ONLY a JSON array of 3 strings, nothing else. Format: ["subtask 1", "subtask 2", "subtask 3"]`;
        
        const request = provider.buildRequest(prompt, apiKey);
        
        const response = await fetch(`${request.url}${request.params}`, request.options);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('API Response Error:', errorBody);
            const friendlyMessage = parseApiError(response.status, errorBody);
            showWarning(friendlyMessage, 'error');
            return;
        }
        
        const data = await response.json();
        const generatedText = provider.parseResponse(data);
        
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
        // Network errors (CORS, offline, etc.)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showWarning('🌐 Network error — check your internet connection or the API endpoint URL.', 'error');
        } else {
            showWarning(`Failed to generate subtasks (${API_PROVIDERS[currentProvider].name}). See console for details.`, 'error');
        }
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
    
    // Timer presets
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes, 10);
            setTimerDuration(minutes);
        });
    });
    
    // Custom timer input
    elements.setCustomTime.addEventListener('click', () => {
        const minutes = parseInt(elements.customMinutes.value, 10);
        if (minutes && minutes >= 1 && minutes <= 180) {
            setTimerDuration(minutes);
            elements.customMinutes.value = '';
        } else {
            showWarning('Please enter a valid duration (1-180 minutes)');
        }
    });
    elements.customMinutes.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') elements.setCustomTime.click();
    });
    
    // API Configuration
    elements.saveApiKey.addEventListener('click', saveApiConfig);
    elements.apiKeyInput.addEventListener('focus', function() {
        if (this.dataset.hasKey === 'true') {
            this.value = '';
            this.dataset.hasKey = 'false';
        }
    });
    elements.apiProvider.addEventListener('change', () => {
        currentProvider = elements.apiProvider.value;
        updateProviderUI();
        // Set default model for new provider if model field is empty
        if (!elements.modelNameInput.value.trim()) {
            elements.modelNameInput.value = API_PROVIDERS[currentProvider].defaultModel;
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
