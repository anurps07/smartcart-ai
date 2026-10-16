# SmartCart AI - AI-Powered Multi-Vendor E-Commerce Marketplace

SmartCart AI is an enterprise-grade, modern multi-vendor marketplace application connecting independent merchants with buyers, backed by an intelligent database-grounded AI shopping assistant, multi-vendor order routing, Razorpay payment verification, and real-time Socket.IO notifications.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios, React Router v6
- **Backend**: Node.js (v22+), Express.js (REST API, Zod Validation, Helmet, CORS, Rate Limiters)
- **Database**: MongoDB (Mongoose ODM, fully validated schemas, indexed queries, integer paise monetary storage)
- **Payments**: Razorpay test mode with HMAC-SHA256 signature verification & idempotent webhooks
- **Real-Time**: Socket.IO for authorized live order and notification updates
- **AI Recommendation Engine**: Hybrid AI architecture with database-grounded search and deterministic fallback

---

## 🚀 Quick Start (Phase 1)

### 1. Prerequisites
- **Node.js**: v18+ (tested on v22.14.0)
- **npm**: v9+ (tested on v10.9.2)
- **MongoDB**: Active instance running on `mongodb://127.0.0.1:27017`

### 2. Installation
Run from the root directory:
```bash
# Install root orchestration dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Setup
Review and configure environment files:
- `server/.env` (preconfigured with development defaults)

### 4. Running the Development Environment
```bash
# Start both backend and frontend concurrently
npm run dev

# Or run separately:
npm run server   # Express API on http://localhost:5000
npm run client   # React Vite on http://localhost:5173
```

### 5. Running Tests
```bash
# Run server tests
cd server && npm test

# Run client tests
cd client && npm test
```

---

## 📡 API Endpoints (Phase 1)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root API welcome message |
| `GET` | `/api/health` | Service health, uptime, and system diagnostics |

---

## 📂 Project Organization

```
smartcart-ai/
├── IMPLEMENTATION_PLAN.md   # Architectural master blueprint & 13 phases
├── PROGRESS.md              # Detailed implementation tracker
├── README.md                # Project documentation
├── .env.example             # Global environment variable reference
├── .gitignore               # Ignored build and dependency artifacts
├── package.json             # Root workspace runner
├── server/                  # Backend Express REST API & Socket.IO
│   ├── src/
│   │   ├── app.js           # Express app & middleware
│   │   ├── server.js        # HTTP & Socket.IO server entrypoint
│   │   ├── config/          # DB & env configuration
│   │   └── middleware/      # Error handler & validation
│   └── tests/               # Backend Vitest tests
└── client/                  # Frontend React + Vite
    ├── src/
    │   ├── App.jsx          # Interactive dashboard & diagnostic UI
    │   ├── api/             # Axios client configuration
    │   └── tests/           # Frontend Vitest tests
    └── vite.config.js       # Vite configuration with API proxy
```

---

## 👤 Author & Repository
- **Author**: anurps07
- **GitHub Target**: [https://github.com/anurps07/smartcart-ai](https://github.com/anurps07/smartcart-ai)
