// --- CONFIGURATION ---
const IS_PRODUCTION = window.location.hostname.includes("songcuya.com");

const CONFIG = {
    chatUrl: IS_PRODUCTION
        ? "https://songcuya.com/ollama/api/chat"
        : "http://192.168.1.42/ollama/api/chat",
    modelsUrl: "./models.json",
    imageApiBase: "https://image.pollinations.ai/prompt/"
};

const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Target both selects (supports unique IDs or a shared ID)
const modelSelectChat = document.getElementById('model-select') || document.getElementById('chat-model-select');
const modelSelectImage = document.querySelector('#image-options #model-select') || document.getElementById('image-model-select');

const aspectRatioSelect = document.getElementById('aspect-ratio');
const imageOptionsDiv = document.getElementById('image-options');
const chatOptionsDiv = document.getElementById('chat-options');
const imageResultDiv = document.getElementById('image-result');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const chatContainer = document.getElementById('chat-container');

let modelSelect = modelSelectChat;
let chatHistory = [];
let currentMode = 'chat';
let allModels = { chatModels: [], imageModels: [], defaultChat: '', defaultImage: '' };

// Load models from external JSON file
async function loadModels() {
    try {
        const response = await fetch(CONFIG.modelsUrl);
        if (!response.ok) throw new Error(`Failed to load models: ${response.status}`);
        const data = await response.json();

        allModels = {
            chatModels: data.chatModels || [],
            imageModels: data.imageModels || [],
            defaultChat: data.defaultChat || data.chatModels?.[0]?.value || '',
            defaultImage: data.defaultImage || data.imageModels?.[0]?.value || ''
        };

        populateModelSelect();
        restoreSavedModel();
    } catch (error) {
        console.error("Error loading models:", error);
        // Fallback default models if fetch fails
        allModels = {
            chatModels: [{ value: "gemma4:cloud", label: "gemma4:cloud" }],
            imageModels: [{ value: "flux", label: "Flux (Pollinations)", provider: "pollinations" }],
            defaultChat: "gemma4:cloud",
            defaultImage: "flux"
        };
        populateModelSelect();
        restoreSavedModel();
    }
}

function populateModelSelect() {
    [modelSelectChat, modelSelectImage].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        const models = currentMode === 'chat' ? allModels.chatModels : allModels.imageModels;

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label || model.value;
            select.appendChild(option);
        });
    });

    const isChat = currentMode === 'chat';
    const models = isChat ? allModels.chatModels : allModels.imageModels;
    const savedKey = isChat ? 'selected-chat-model' : 'selected-image-model';
    const savedModel = localStorage.getItem(savedKey);
    const defaultVal = isChat ? allModels.defaultChat : allModels.defaultImage;
    
    const targetSelect = isChat ? modelSelectChat : modelSelectImage;
    if (targetSelect) {
        targetSelect.value = savedModel || defaultVal || models[0]?.value;
        modelSelect = targetSelect;
    }

    const savedRatio = localStorage.getItem('selected-aspect-ratio') || '1:1';
    if (aspectRatioSelect) aspectRatioSelect.value = savedRatio;
}

function restoreSavedModel() {
    const savedMode = localStorage.getItem('selected-mode') || 'chat';
    currentMode = savedMode;
    const radio = document.querySelector(`input[name="mode"][value="${savedMode}"]`);
    if (radio) radio.checked = true;
    toggleModeUI();
}

// Switch between chat and image mode
function toggleModeUI() {
    const isImageMode = currentMode === 'image';

    // --- DISABLE/ENABLE MESSAGES DIV ---
    if (isImageMode) {
        messagesDiv.style.pointerEvents = 'none'; // Prevents scrolling/clicking
        messagesDiv.style.opacity = '0.5';        // Visual "grayed out" effect
        messagesDiv.style.userSelect = 'none';    // Prevents text selection
    } else {
        messagesDiv.style.pointerEvents = 'auto';  // Restores interaction
        messagesDiv.style.opacity = '1';         // Restores full color
        messagesDiv.style.userSelect = 'auto';     // Restores text selection
    }
    // ----------------------------------

    chatContainer.classList.toggle('image-mode', isImageMode);
    userInput.placeholder = isImageMode
        ? "Describe the image you want to generate..."
        : "Type a message...";

    imageResultDiv.style.display = isImageMode ? 'flex' : 'none';

    if (isImageMode) {
        modelSelect = modelSelectImage;
        chatOptionsDiv.style.display = 'none';
        imageOptionsDiv.style.display = 'flex';
    } else {
        modelSelect = modelSelectChat;
        imageOptionsDiv.style.display = 'none';
        chatOptionsDiv.style.display = 'flex';
    }

    populateModelSelect();
}

// Mode radio change handlers
modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        localStorage.setItem('selected-mode', currentMode);
        toggleModeUI();
    });
});

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    div.innerText = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return div;
}

function showImageError(message) {
    imageResultDiv.innerHTML = `<p class="image-error">❌ ${message}</p>`;
    imageResultDiv.style.display = 'flex';
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    userInput.value = '';
    sendBtn.disabled = true;

    if (currentMode === 'chat') {
        imageResultDiv.style.display = 'none';
        await sendChatMessage(text);
    } else {
        await generateImage(text);
    }

    sendBtn.disabled = false;
}

async function sendChatMessage(text) {
    chatHistory.push({ role: 'user', content: text });
    
    const selectedModel = modelSelect.value; 
    const modelMark = document.createElement('div');
    modelMark.classList.add('model-name-mark'); 
    modelMark.innerText = selectedModel;
    messagesDiv.appendChild(modelMark);

   
    const botMsgDiv = addMessage('assistant', '...');
    botMsgDiv.innerText = ""; 

    // const textContainer = document.createElement('span');
    // textContainer.innerText = "..."; 
    // botMsgDiv.appendChild(textContainer);

    let fullResponse = "";

    try {
        const response = await fetch(CONFIG.chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelSelect.value,
                messages: chatHistory,
                stream: true
            })
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        botMsgDiv.innerText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.message && json.message.content) {
                        fullResponse += json.message.content;
                        botMsgDiv.innerText = fullResponse;
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    }
                } catch (e) {}
            }
        }
        chatHistory.push({ role: 'assistant', content: fullResponse });

    } catch (error) {
        botMsgDiv.innerText = "❌ Error: Could not connect to chat server. Usage may be limited. Please try again later.";
        console.error(error);
    }
}

async function generateImage(prompt) {
    const loadingMsg = addMessage('assistant', 'Generating image...');

    try {
        const modelInfo = allModels.imageModels.find(m => m.value === modelSelect.value);
        const provider = modelInfo?.provider || 'pollinations';

        const aspectRatios = {
            '1:1':  { w: 1024, h: 1024 },
            '9:16': { w: 768,  h: 1365 },
            '16:9': { w: 1365, h: 768 },
            '3:4':  { w: 896,  h: 1152 },
            '4:3':  { w: 1152, h: 896 }
        };
        const ratio = aspectRatioSelect?.value || '1:1';
        const { w, h } = aspectRatios[ratio] || aspectRatios['1:1'];

        let imageUrl = "";
        if (provider === 'pollinations') {
            const encodedPrompt = encodeURIComponent(prompt);
            const params = new URLSearchParams({
                model: modelSelect.value,
                width: String(w),
                height: String(h),
                nologo: 'true',
                enhance: 'true'
            });
            imageUrl = `${CONFIG.imageApiBase}${encodedPrompt}?${params.toString()}`;
        }

        localStorage.setItem('selected-aspect-ratio', ratio);

        loadingMsg.remove();
        showImage(imageUrl, prompt);
        //addMessage('assistant', `Image generated successfully using ${modelSelect.value} (${ratio})`);

    } catch (error) {
        console.error("Image generation error:", error);
        loadingMsg.remove();
        showImageError("Failed to generate image. Please try again.");
        //addMessage('assistant', '❌ Error: Could not generate image. Usage may be limited. Please try again later.');
    }
}

function showImage(imageUrl, prompt) {
    imageResultDiv.innerHTML = `
        <img src="${imageUrl}" alt="${prompt}" loading="lazy" onload="this.style.opacity=1">
        <div class="image-actions">
            <a href="${imageUrl}" target="_blank" download="generated-image.png" class="btn-download">Download</a>
            <button onclick="copyImageUrl('${imageUrl}')" class="btn-copy">Copy URL</button>
        </div>
        <p class="image-prompt"><strong>Prompt:</strong> ${prompt}</p>
    `;
    imageResultDiv.style.display = 'flex';
}

function copyImageUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Image URL copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Model selection event listeners
[modelSelectChat, modelSelectImage].forEach(select => {
    if (!select) return;
    select.addEventListener('change', () => {
        const key = currentMode === 'chat' ? 'selected-chat-model' : 'selected-image-model';
        localStorage.setItem(key, select.value);
        if (modelSelectChat && modelSelectChat !== select) modelSelectChat.value = select.value;
        if (modelSelectImage && modelSelectImage !== select) modelSelectImage.value = select.value;
    });
});

if (aspectRatioSelect) {
    aspectRatioSelect.addEventListener('change', () => {
        localStorage.setItem('selected-aspect-ratio', aspectRatioSelect.value);
    });
}

if (sendBtn) sendBtn.onclick = sendMessage;
if (userInput) {
    userInput.onkeypress = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(); 
        }
    };
}

// Initialize App
loadModels();