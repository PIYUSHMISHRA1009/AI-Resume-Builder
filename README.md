# 🧠 AI Resume Builder

A full-stack AI-powered resume builder that lets users create, edit, and share professional resumes with multiple templates, accent color customization, and AI-assisted content generation.

---

## ✨ Features

- **AI-Powered Content** — Enhance professional summaries and job descriptions using OpenAI
- **PDF Resume Upload** — Upload an existing PDF resume and auto-extract data via AI
- **Multiple Templates** — Classic, Modern, Minimal, and Minimal Image layouts
- **Accent Color Picker** — Customize resume color themes
- **Profile Photo Upload** — Supports background removal via ImageKit
- **Public/Private Toggle** — Share resumes via a public link
- **Download as PDF** — Print-ready resume export
- **Authentication** — JWT-based register/login system

---

## 🗂️ Project Structure

```
├── client/          # React + Vite frontend
│   └── src/
│       ├── assets/templates/   # Resume template components
│       ├── components/         # Form and UI components
│       ├── pages/              # Dashboard, Builder, Preview, Login
│       ├── app/                # Redux store & auth slice
│       └── configs/            # Axios instance
│
└── server/          # Express backend
    ├── controllers/            # User, Resume, AI controllers
    ├── models/                 # Mongoose schemas
    ├── routes/                 # API routes
    ├── middlewares/            # JWT auth middleware
    └── configs/                # DB, AI, ImageKit, Multer
```

---

## 🛠️ Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19, Vite, Tailwind CSS v4, Redux  |
| Backend    | Node.js, Express 5                      |
| Database   | MongoDB (Mongoose)                      |
| AI         | OpenAI API (via custom base URL)        |
| Storage    | ImageKit (image upload + bg removal)   |
| Auth       | JWT + bcrypt                            |

---

## ⚙️ Getting Started

### Prerequisites

- Node.js >= 20
- MongoDB instance (local or Atlas)
- OpenAI API key
- ImageKit account (private key)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ai-resume-builder.git
cd ai-resume-builder
```

---

### 2. Setup the Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

Start the server:

```bash
npm run server      # development (nodemon)
# or
npm start           # production
```

---

### 3. Setup the Client

```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory:

```env
VITE_BASE_URL=http://localhost:3000
```

Start the dev server:

```bash
npm run dev
```

---

## 📡 API Reference

### Users
| Method | Endpoint           | Auth | Description          |
|--------|--------------------|------|----------------------|
| POST   | /api/users/register | ❌  | Register new user    |
| POST   | /api/users/login    | ❌  | Login                |
| GET    | /api/users/data     | ✅  | Get current user     |
| GET    | /api/users/resumes  | ✅  | Get all user resumes |

### Resumes
| Method | Endpoint                     | Auth | Description            |
|--------|------------------------------|------|------------------------|
| POST   | /api/resumes/create          | ✅  | Create new resume      |
| PUT    | /api/resumes/update          | ✅  | Update resume + image  |
| DELETE | /api/resumes/delete/:id      | ✅  | Delete resume          |
| GET    | /api/resumes/get/:id         | ✅  | Get resume (private)   |
| GET    | /api/resumes/public/:id      | ❌  | Get resume (public)    |

### AI
| Method | Endpoint                  | Auth | Description                    |
|--------|---------------------------|------|--------------------------------|
| POST   | /api/ai/enhance-pro-sum   | ✅  | Enhance professional summary   |
| POST   | /api/ai/enhance-job-desc  | ✅  | Enhance job description        |
| POST   | /api/ai/upload-resume     | ✅  | Parse uploaded resume PDF      |

---

## 🚀 Deploying to GitHub

### Step-by-step: Push to a new GitHub repo

```bash
# 1. Initialize git (if not already)
git init

# 2. Create a .gitignore (already present, covers node_modules, .env, dist)

# 3. Stage all files
git add .

# 4. Make your first commit
git commit -m "Initial commit: AI Resume Builder"

# 5. Create a new repo on GitHub (via github.com), then add it as remote
git remote add origin https://github.com/your-username/ai-resume-builder.git

# 6. Push
git branch -M main
git push -u origin main
```


## 📄 License

This project is open source and available under the [MIT License](LICENSE).
