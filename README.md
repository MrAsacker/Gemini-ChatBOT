# Gemini Chatbot

A modern, interactive chatbot web application powered by Google Gemini API. This project features a sleek UI, persistent chat history, file uploads, and voice input, all running securely with a serverless backend to protect your API key.

---

## ✨ Features

- **Conversational AI**: Chat with Gemini, powered by Google’s Gemini API.
- **Secure API Key**: Gemini API key is hidden using a Vercel serverless function (api/gemini.js). The frontend fetches /api/gemini, and the backend uses the API key from environment variables. The key is never exposed to the browser.
- **Persistent Chat History**: Chats are saved in your browser and can be renamed, pinned, or deleted.
- **File Uploads**: Send images and files to the chatbot.
- **Voice Input**: Use your microphone to send messages.
- **Responsive UI**: Works on desktop and mobile.

---

## 🚀 Getting Started

### 1. Clone the Repository
```sh
git clone https://github.com/yourusername/gemini-chatbot.git
cd gemini-chatbot
```

### 2. Project Structure
```
Gemini chatbot/
  ├── api/
  │   └── gemini.js         # Serverless function (backend)
  ├── assets/               # Images and icons
  ├── index.html            # Main HTML file
  ├── script.js             # Frontend logic
  ├── style.css             # Styles
  └── README.md             # This file
```

### 3. Local Development (Optional)
You can use [Vercel CLI](https://vercel.com/docs/cli) to run locally:
```sh
npm i -g vercel
vercel dev
```

**Important:**
- The frontend fetches `/api/gemini` (not the Gemini API directly).
- The backend function (`api/gemini.js`) reads your Gemini API key from environment variables and proxies the request to Gemini.
- Never put your Gemini API key in frontend code.

**File/Image Upload:**
- You can upload files and images. You can remove any selected file/image before sending using the (X) button in the preview bar.
- The preview bar is compact and modern, and images are not sent until you press Enter or click Send.

**Deep Research Button:**
- The Deep Research button is now just a UI element and does not affect the prompt or API call.

---

## 🛡️ Hiding Your API Key
- **Never** put your Gemini API key in frontend code.
- The key is stored as an environment variable and only used in `api/gemini.js`.

---

## 🛠️ Deployment (Vercel)

1. **Push your code to GitHub.**
2. **Go to [Vercel](https://vercel.com/)** and import your repo.
3. **Set Environment Variable:**
   - Name: `GEMINI_API_KEY`
   - Value: _your Gemini API key_
4. **Deploy!**

---

## 💬 Usage
- Open the deployed site.
- Type or speak your message.
- Upload files if needed.
- View, rename, pin, or delete chat history.

---

## 📁 Customization
- Edit `style.css` for UI changes.
- Update `script.js` for frontend logic.
- Extend `api/gemini.js` for more backend features.

---

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
[MIT](LICENSE)

---

## 🙏 Acknowledgements
- [Google Gemini API](https://ai.google.dev/)
- [Vercel](https://vercel.com/)
- [Marked.js](https://marked.js.org/) for Markdown rendering
- [highlight.js](https://highlightjs.org/) for code highlighting 
