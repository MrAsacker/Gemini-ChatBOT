// ----------------------
// Sidebar collapse
// ----------------------
const menuIcon = document.getElementById("menu-icon");
const sidebar = document.querySelector(".sidebar");
menuIcon.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

// ----------------------
// Gemini API chat logic
// ----------------------


const promptInput = document.getElementById("prompt");
const chatContainer = document.getElementById("chat-container");


// helper to add a bubble; returns the DOM node
function addMessage(text, sender = "bot", withLoader = false) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-bubble ${sender}`;
  if (withLoader && sender === "bot") {
    const loader = document.createElement("img");
    loader.src = "assets/gemini-chatbot-logo.svg";
    loader.className = "gemini-loader";
    loader.alt = "Gemini loading";
    msgDiv.appendChild(loader);
    const span = document.createElement("span");
    span.className = "thinking-text";
    span.textContent = text;
    msgDiv.appendChild(span);
  } else {
    msgDiv.innerHTML = marked.parse(text);
  }
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return msgDiv;
}

// Helper to "stream" text into a bubble
async function streamTextToBubble(bubble, text, delay = 30) {
  bubble.innerText = "";
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    bubble.innerText += (i > 0 ? " " : "") + words[i];
    bubble.scrollTop = bubble.scrollHeight;
    await new Promise(res => setTimeout(res, delay));
  }
  bubble.innerHTML = marked.parse(text);
  // Highlight code blocks after rendering
  if (window.hljs) {
    bubble.querySelectorAll('pre code').forEach(block => {
      window.hljs.highlightElement(block);
    });
  }
}

// Conversation context and persistent chat history
let conversationHistory = [];
let chatHistories = JSON.parse(localStorage.getItem('chatHistories') || '{}');
let currentChatId = localStorage.getItem('currentChatId') || null;

// Initialize global selectedFiles array for file preview logic
window.selectedFiles = [];

function saveCurrentChatToHistory() {
  // Use first user message or timestamp as title
  const title = conversationHistory.find(msg => msg.role === 'user')?.parts[0]?.text?.slice(0, 40) || `Chat ${Date.now()}`;
  let id = currentChatId;
  if (!id) {
    id = Date.now().toString();
  }
  // Only store text parts in history (no inline_data)
  const safeConversation = conversationHistory.map(msg => ({
    role: msg.role,
    parts: msg.parts.filter(p => p.text).map(p => ({ text: p.text }))
  }));
  chatHistories[id] = { title, conversation: safeConversation };
  localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
  localStorage.setItem('currentChatId', id); // Persist current chat
  currentChatId = id;
  renderRecentChats();
}

function renderRecentChats() {
  const recentDiv = document.querySelector('.recent-history');
  if (!recentDiv) return;
  recentDiv.innerHTML = '';
  // Sort: pinned chats first
  const sortedChats = Object.entries(chatHistories).sort((a, b) => {
    const aPinned = chatHistories[a[0]].pinned ? -1 : 0;
    const bPinned = chatHistories[b[0]].pinned ? -1 : 0;
    return bPinned - aPinned || b[0] - a[0];
  });
  sortedChats.reverse().forEach(([id, chat]) => {
    const p = document.createElement('p');
    p.className = 'recent-item' + (chat.pinned ? ' pinned-chat' : '');
    p.innerHTML = `<span>${chat.title}</span> <img src="assets/more_vert.png" alt="more options" class="more-options-icon" style="cursor:pointer;vertical-align:middle;" />`;
    p.style.cursor = 'pointer';
    p.onclick = (e) => {
      // Only open chat if not clicking the options icon
      if (!e.target.classList.contains('more-options-icon')) loadChatHistory(id);
    };
    // Custom options menu
    const menu = document.createElement('div');
    menu.className = 'chat-options-menu';
    menu.innerHTML = `
      <button class="rename-btn">Rename</button>
      <button class="pin-btn">${chat.pinned ? 'Unpin' : 'Pin'}</button>
      <button class="delete-btn">Delete</button>
    `;
    p.appendChild(menu);
    // Show/hide menu
    p.querySelector('.more-options-icon').onclick = (ev) => {
      ev.stopPropagation();
      // Close any other open menus
      document.querySelectorAll('.chat-options-menu.active').forEach(m => m.classList.remove('active'));
      menu.classList.toggle('active');
      // Position menu
      const rect = ev.target.getBoundingClientRect();
      menu.style.top = `${ev.target.offsetTop + 24}px`;
      menu.style.left = `${ev.target.offsetLeft - 60}px`;
      // Add global click handler to close menu if clicking outside
      function closeMenuOnClick(e) {
        if (!menu.contains(e.target) && !ev.target.contains(e.target)) {
          menu.classList.remove('active');
          document.removeEventListener('click', closeMenuOnClick);
        }
      }
      document.addEventListener('click', closeMenuOnClick);
    };
    // Rename
    menu.querySelector('.rename-btn').onclick = (ev) => {
      ev.stopPropagation();
      const newTitle = prompt('Enter a new name for this chat:', chatHistories[id].title);
      if (newTitle && newTitle.trim()) {
        chatHistories[id].title = newTitle.trim();
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
        renderRecentChats();
      }
      menu.classList.remove('active');
    };
    // Pin/Unpin
    menu.querySelector('.pin-btn').onclick = (ev) => {
      ev.stopPropagation();
      chatHistories[id].pinned = !chatHistories[id].pinned;
      localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
      renderRecentChats();
      menu.classList.remove('active');
    };
    // Delete
    menu.querySelector('.delete-btn').onclick = (ev) => {
      ev.stopPropagation();
      delete chatHistories[id];
      localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
      renderRecentChats();
      menu.classList.remove('active');
    };
    recentDiv.appendChild(p);
  });
  // Close menu on click outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.chat-options-menu.active').forEach(m => m.classList.remove('active'));
  }, { once: true });
}

// Helper to remove greeting if present
function removeGreeting() {
  const greeting = document.querySelector('.greeting');
  if (greeting) greeting.style.display = 'none';
}

function loadChatHistory(id) {
  const chat = chatHistories[id];
  if (!chat) return;
  conversationHistory = chat.conversation.map(msg => ({ ...msg }));
  // Render the chat in the chat container
  chatContainer.innerHTML = '';
  conversationHistory.forEach(msg => {
    if (msg.role === 'user') {
      addMessage(marked.parse(msg.parts[0].text), 'user');
    } else if (msg.role === 'model') {
      addMessage(marked.parse(msg.parts[0].text), 'bot');
    }
  });
  // Hide greeting if present
  removeGreeting();
  chatContainer.style.display = 'flex';
  // Persist current chat id
  localStorage.setItem('currentChatId', id);
  currentChatId = id;
}

// On page load, restore last chat or ongoing conversation
window.addEventListener("DOMContentLoaded", () => {
  renderRecentChats();
  currentChatId = localStorage.getItem('currentChatId') || null;
  if (currentChatId && chatHistories[currentChatId]) {
    loadChatHistory(currentChatId);
  } else if (conversationHistory.length > 0) {
    // Restore unsaved ongoing chat
    chatContainer.innerHTML = '';
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        addMessage(marked.parse(msg.parts[0].text), 'user');
      } else if (msg.role === 'model') {
        addMessage(marked.parse(msg.parts[0].text), 'bot');
      }
    });
    removeGreeting();
    chatContainer.style.display = 'flex';
  } else {
    // Default: hide chat container if greeting exists
    const greeting = document.querySelector('.greeting');
    if (greeting && chatContainer) {
      chatContainer.style.display = "none";
      greeting.style.display = '';
    }
  }
});

// New Chat functionality
const newChatBtn = document.querySelector('.new-chat');
if (newChatBtn) {
  newChatBtn.addEventListener('click', () => {
    // Save current chat if it has content and is not empty
    if (conversationHistory.length > 0) {
      saveCurrentChatToHistory();
    }
    // Reset conversation history and current chat id
    conversationHistory = [];
    currentChatId = null;
    localStorage.removeItem('currentChatId');
    // Clear chat container
    chatContainer.innerHTML = '';
    // Hide chat container
    chatContainer.style.display = 'none';
    // Show greeting if not present
    let greetingDiv = document.querySelector('.greeting');
    if (!greetingDiv) {
      const chatArea = document.querySelector('.chat-area');
      if (chatArea) {
        greetingDiv = document.createElement('div');
        greetingDiv.className = 'greeting';
        greetingDiv.innerHTML = `
          <span class="gradient-text">Hello, Asacker</span>
          <p>How can I help you today?</p>
        `;
        chatArea.insertBefore(greetingDiv, chatArea.firstChild);
      }
    }
    if (greetingDiv) greetingDiv.style.display = '';
    // Focus prompt input
    promptInput.value = '';
    promptInput.focus();
    // Optionally, scroll to top
    chatContainer.scrollTop = 0;
  });
}

// File upload logic
const fileUploadBtn = document.getElementById("file-upload-btn");
const fileInput = document.getElementById("file-input");

fileUploadBtn.addEventListener("click", (e) => {
  e.preventDefault();
  fileInput.click();
});

let lastFilePreviewHTML = "";

// Helper to truncate file names
function truncateFileName(name, maxLength = 18) {
  if (name.length <= maxLength) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  return name.slice(0, maxLength - ext.length - 3) + '...' + ext;
}

// Helper to get file parts from selected files
async function getFilePartsFromSelectedFiles() {
  const files = window.selectedFiles || [];
  const fileParts = [];
  for (const file of files) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    fileParts.push({ inline_data: { mime_type: file.type || "application/octet-stream", data: base64 } });
  }
  return fileParts;
}

async function renderFilePreview() {
  let fileParts = [];
  let filePreviews = [];
  const files = window.selectedFiles;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Read file as base64 (for all types)
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    fileParts.push({ inline_data: { mime_type: file.type || "application/octet-stream", data: base64 } });
    if (file.type.startsWith("image/")) {
      filePreviews.push(
        `<span class="file-preview-wrapper">
          <img src="${window.URL.createObjectURL(file)}" alt="preview" class="file-preview-img" />
          <button class="remove-file-btn" data-index="${i}">&times;</button>
        </span>`
      );
    } else {
      filePreviews.push(
        `<div class="file-pill">
          <span class="file-icon">📄</span>${truncateFileName(file.name, 14)}
          <button class="remove-file-btn" data-index="${i}">&times;</button>
        </div>`
      );
    }
  }
  lastFilePreviewHTML = filePreviews.join("");
  window.fileParts = fileParts;

  const filePreview = document.getElementById('file-preview');
  if (filePreview) {
    filePreview.innerHTML = lastFilePreviewHTML;

    // Add remove button listeners
    filePreview.querySelectorAll('.remove-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        window.selectedFiles.splice(idx, 1);
        renderFilePreview();
      });
    });
  }
}

fileInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  // Add new files to the global array
  window.selectedFiles = window.selectedFiles.concat(files);

  renderFilePreview();
});

promptInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  let prompt = promptInput.value.trim();
  const fileParts = await getFilePartsFromSelectedFiles();
  if (!prompt && fileParts.length === 0) return;

  // ——— Hide the greeting on first message ———
  removeGreeting();
  if (chatContainer) chatContainer.style.display = "flex";

  // 1) show user message (prompt + file preview if any)
  let userMsg = "";
  if (prompt) userMsg += marked.parse(prompt);
  if (lastFilePreviewHTML) userMsg += lastFilePreviewHTML;
  addMessage(userMsg || "[No content]", "user");
  lastFilePreviewHTML = "";
  promptInput.value = "";
  promptInput.disabled = true;

  // Clear the file preview and selected files after sending
  const filePreview = document.getElementById('file-preview');
  if (filePreview) filePreview.innerHTML = '';
  window.selectedFiles = [];

  // Add user message to conversation history
  let userParts = [];
  if (prompt) userParts.push({ text: prompt });
  if (fileParts.length > 0) {
    userParts = userParts.concat(fileParts);
  }
  conversationHistory.push({ role: 'user', parts: userParts });

  // 2) show a placeholder "Thinking..." bot bubble
  const thinkingBubble = addMessage("Thinking...", "bot", true);

  try {
    // Always send full conversation history for context
    const userName = localStorage.getItem('userName');
    let conversationToSend = conversationHistory;
    if (userName && userName.trim()) {
      const systemPrompt = {
        role: 'user',
        parts: [{
          text: `Always refer to me as \"${userName}\". Do not use any other name or phrase to refer to me. Do not say you do not know my name. If you need to address me, use only \"${userName}\".`
        }]
      };
      conversationToSend = [systemPrompt, ...conversationHistory];
    }
    const body = {
      contents: conversationToSend,
      tools: [{ google_search: {} }]
    };
    // console.log("Sending to Gemini API:", JSON.stringify(body));
    const res = await fetch(/api/gemini, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    // console.log("Gemini API full response:", data);
    // 4) extract the reply
    const reply =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('')?.trim() ||
      data?.error?.message ||
      "No response received.";

    // 5) remove the "Thinking..." bubble and append the real one
    thinkingBubble.innerHTML = ""; // Clear "Thinking..." and loader
    await streamTextToBubble(thinkingBubble, reply, 30); // 30ms per word

    // Add model reply to conversation history
    conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
    saveCurrentChatToHistory();
  } catch (err) {
    thinkingBubble.remove();
    addMessage("Error: " + err.message, "bot");
    console.error("Error sending to Gemini API:", err);
  } finally {
    promptInput.disabled = false;
  }
});

// Mic/Send icon swap logic
const micBtn = document.querySelector('.mic-icon-btn');
const micSpan = micBtn ? micBtn.querySelector('.mic') : null;
let sendImg = null;

function updateMicSendIcon() {
  if (!micBtn) return;
  // Remove both icons first
  if (sendImg && micBtn.contains(sendImg)) micBtn.removeChild(sendImg);
  if (micSpan && micBtn.contains(micSpan)) micBtn.removeChild(micSpan);
  if (promptInput.value.trim()) {
    // Show send icon
    if (!sendImg) {
      sendImg = document.createElement('img');
      sendImg.src = 'assets/send_icon.png';
      sendImg.alt = 'Send';
      sendImg.style.width = '24px';
      sendImg.style.height = '24px';
      sendImg.style.cursor = 'pointer';
    }
    micBtn.appendChild(sendImg);
  } else {
    // Show mic icon
    if (micSpan) micBtn.appendChild(micSpan);
  }
}

promptInput.addEventListener('input', updateMicSendIcon);
window.addEventListener('DOMContentLoaded', updateMicSendIcon);

// Also update icon after sending a message
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    setTimeout(updateMicSendIcon, 10);
  }
});

// Voice input (Web Speech API)
let recognition = null;
let isListening = false;
let micSendIconTimeout = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) micBtn.classList.add('listening');
    if (micSendIconTimeout) clearTimeout(micSendIconTimeout);
  };
  recognition.onend = () => {
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    // Delay icon update after voice input
    if (micSendIconTimeout) clearTimeout(micSendIconTimeout);
    micSendIconTimeout = setTimeout(updateMicSendIcon, 1500);
  };
  recognition.onerror = (event) => {
    isListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    if (micSendIconTimeout) clearTimeout(micSendIconTimeout);
    micSendIconTimeout = setTimeout(updateMicSendIcon, 1500);
    // Optionally, show error to user
    // alert('Voice recognition error: ' + event.error);
  };
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    promptInput.value = transcript;
    promptInput.focus();
    // Do not call updateMicSendIcon here; let the delay handle it
  };
}

if (micBtn) {
  micBtn.onclick = (e) => {
    if (promptInput.value.trim()) {
      // Trigger send (simulate Enter)
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      promptInput.dispatchEvent(event);
    } else if (recognition && !isListening) {
      recognition.start();
    }
  };
}
// Add a style for listening state
const style = document.createElement('style');
style.innerHTML = `.mic-icon-btn.listening { background: #2a7fff !important; }`;
document.head.appendChild(style);

function updateUpgradeButtonName() {
  const upgradeBtn = document.getElementById('upgrade');
  const userName = localStorage.getItem('userName');
  if (upgradeBtn) {
    upgradeBtn.textContent = userName && userName.trim() ? userName : 'Set Name';
  }
}
window.addEventListener('DOMContentLoaded', () => {
  updateUpgradeButtonName();
  updateGreeting();
});

function updateGreeting() {
  const userName = localStorage.getItem('userName') || 'Mitra';
  const greetingDiv = document.querySelector('.greeting');
  if (greetingDiv) {
    greetingDiv.innerHTML = `
      <span class="gradient-text">Hello, ${userName}</span>
      <p>How can I help you today?</p>
    `;
  }
}

// Get elements
const anyaLogo = document.getElementById('anya-logo');
const nameDropdown = document.getElementById('name-dropdown');
const nameInput = document.getElementById('name-input');
const saveNameBtn = document.getElementById('save-name-btn');
const clearNameBtn = document.getElementById('clear-name-btn');
const clearAllChatsBtn = document.getElementById('clear-all-chats');
const upgradeBtn = document.getElementById('upgrade');

// Show dropdown on Anya logo or upgrade button click
function showNameDropdown() {
  if (!(anyaLogo && nameDropdown && nameInput)) return;
  const rect = (anyaLogo || upgradeBtn).getBoundingClientRect();
  nameDropdown.style.display = 'block';
  let top = rect.bottom + 8;
  let left = rect.left;
  // Adjust for screen edges
  nameDropdown.style.visibility = 'hidden';
  nameDropdown.style.left = '0px';
  nameDropdown.style.top = '0px';
  const dropdownRect = nameDropdown.getBoundingClientRect();
  nameDropdown.style.visibility = 'visible';
  if (left + dropdownRect.width > window.innerWidth) {
    left = window.innerWidth - dropdownRect.width - 10;
  }
  if (top + dropdownRect.height > window.innerHeight) {
    top = rect.top - dropdownRect.height - 8;
    if (top < 0) top = 10;
  }
  nameDropdown.style.top = `${top}px`;
  nameDropdown.style.left = `${left}px`;
  // Set input value to current name
  nameInput.value = localStorage.getItem('userName') || '';
  nameInput.focus();
}

if (anyaLogo && nameDropdown && nameInput) {
  anyaLogo.addEventListener('click', showNameDropdown);
}
if (upgradeBtn && nameDropdown && nameInput) {
  upgradeBtn.addEventListener('click', showNameDropdown);
}
// Hide dropdown when clicking outside
document.addEventListener('click', function hideDropdown(e) {
  if (nameDropdown.style.display === 'block' && !nameDropdown.contains(e.target) && e.target !== anyaLogo && e.target !== upgradeBtn) {
    nameDropdown.style.display = 'none';
  }
});

// Save name
if (saveNameBtn && nameInput && nameDropdown) {
  saveNameBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name) {
      localStorage.setItem('userName', name);
      updateGreeting();
      updateUpgradeButtonName();
      nameDropdown.style.display = 'none';
    }
  });
}

// Clear name
if (clearNameBtn && nameDropdown) {
  clearNameBtn.addEventListener('click', () => {
    localStorage.removeItem('userName');
    updateGreeting();
    updateUpgradeButtonName();
    nameDropdown.style.display = 'none';
  });
}

// Save name on Enter key
if (nameInput && nameDropdown) {
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = nameInput.value.trim();
      if (name) {
        localStorage.setItem('userName', name);
        updateGreeting();
        updateUpgradeButtonName();
        nameDropdown.style.display = 'none';
      }
    }
  });
}

if (clearAllChatsBtn) {
  clearAllChatsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all chats? This cannot be undone.')) {
      localStorage.removeItem('chatHistories');
      localStorage.removeItem('currentChatId');
      chatHistories = {};
      conversationHistory = [];
      currentChatId = null;
      chatContainer.innerHTML = '';
      // Show greeting if present and hide chat container
      let greetingDiv = document.querySelector('.greeting');
      if (greetingDiv) greetingDiv.style.display = '';
      chatContainer.style.display = 'none';
      renderRecentChats();
      const filePreview = document.getElementById('file-preview');
      if (filePreview) filePreview.innerHTML = '';
      window.selectedFiles = [];
    }
  });
}

