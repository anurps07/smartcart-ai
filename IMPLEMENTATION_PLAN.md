# SMARTCART AI - MASTER ARCHITECTURAL IMPLEMENTATION PLAN

## 1. System Overview & Architecture

**SmartCart AI** is a production-grade, AI-powered multi-vendor e-commerce marketplace built using modern full-stack web standards:
- **Frontend**: React (Vite, ES Modules), Tailwind CSS, Lucide React, React Router v6, Axios, Context API state management.
- **Backend**: Node.js, Express.js (REST API, Zod validation, Helmet, CORS, express-rate-limit, Socket.IO for real-time events).
- **Database**: MongoDB with Mongoose ODM (fully indexed, validated schemas, transactions/atomic updates, integer paise monetary storage).
- **Payment Gateway**: Razorpay (test mode, cryptographically verified signatures, idempotent webhook processing, explicit refund & failure states).
- **Storage**: Cloudinary adapter for media with local storage fallback.
- **AI Recommendation Engine**: Hybrid architecture with server-side AI provider adapter (Google Gemini / OpenAI / LLM adapter) and a deterministic database-grounded rule-based fallback.

```
                              +-------------------------------------------+
                              |          Client Tier (React + Vite)       |
                              |  - Public Catalog, Search, AI Assistant   |
                              |  - Buyer Portal (Cart, Orders, Reviews)   |
                              |  - Vendor Portal (Inventory, Fulfillment) |
                              |  - Admin Dashboard (Approvals, Moderation)|
                              +---------------------+---------------------+
                                                    | HTTP REST / WebSocket
                                                    v
+---------------------------------------------------+---------------------------------------------------+
|                                 Server Tier (Node.js + Express + Socket.IO)                           |
|  [Security Layer] Helmet, CORS, Rate Limiters, Zod Schema Validation, HttpOnly Cookie/Bearer Auth     |
|  [API Routers] /auth, /users, /vendors, /categories, /products, /cart, /orders, /payments, /ai, etc.  |
|  [Domain Services] OrderOrchestrator, InventoryManager, PaymentService, RecommendationEngine          |
+-------------------------+---------------------------------+-----------------------------------+-------+
                          |                                 |                                   |
                          v                                 v                                   v
             +------------+-----------+       +-------------+------------+         +------------+-----------+
             |    MongoDB Database    |       |   Razorpay Payment GW    |         |   AI Service Adapter   |
             | - Mongoose Schemas     |       | - Orders API (test mode) |         | - Real Catalog Context |
             | - ACID Transactions    |       | - Signature Verification |         | - Semantic Matching    |
             | - Compound Indexes     |       | - Idempotent Webhooks    |         | - Deterministic Rules  |
             +------------------------+       +--------------------------+         +------------------------+
```

---

## 2. Directory Structure

```
smartcart-ai/
├── IMPLEMENTATION_PLAN.md
├── PROGRESS.md
├── README.md
├── .gitignore
├── .env.example
├── package.json                 # Monorepo root runner (concurrently)
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js               # Express application configuration & middleware
│   │   ├── server.js            # HTTP + Socket.IO server bootstrap
│   │   ├── config/              # DB, env, payment, storage, AI adapters
│   │   │   ├── db.js
│   │   │   ├── env.js
│   │   │   └── razorpay.js
│   │   ├── constants/           # Roles, OrderStatus, PaymentStatus, etc.
│   │   ├── controllers/         # Request handling & HTTP response mapping
│   │   │   ├── authController.js
│   │   │   ├── vendorController.js
│   │   │   ├── productController.js
│   │   │   ├── cartController.js
│   │   │   ├── orderController.js
│   │   │   ├── paymentController.js
│   │   │   ├── reviewController.js
│   │   │   ├── aiController.js
│   │   │   └── adminController.js
│   │   ├── middleware/          # Security, auth, validation, error handler
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   ├── validateMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── models/              # Mongoose schemas & indexes
│   │   │   ├── User.js
│   │   │   ├── Vendor.js
│   │   │   ├── Category.js
│   │   │   ├── Product.js
│   │   │   ├── Cart.js
│   │   │   ├── Wishlist.js
│   │   │   ├── Address.js
│   │   │   ├── Order.js
│   │   │   ├── Payment.js
│   │   │   ├── Review.js
│   │   │   ├── Notification.js
│   │   │   ├── PriceAlert.js
│   │   │   └── AuditLog.js
│   │   ├── routes/              # Express API route modules
│   │   ├── services/            # Pure business logic & integrations
│   │   │   ├── orderService.js
│   │   │   ├── inventoryService.js
│   │   │   ├── paymentService.js
│   │   │   ├── aiService.js
│   │   │   └── socketService.js
│   │   ├── utils/               # Currency, hashing, audit logger, token helpers
│   │   └── seeds/               # Realistic seed data and bootstrap scripts
│   └── tests/                   # Backend Vitest / Supertest suite
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── api/                 # Axios client with interceptors
        ├── components/          # Reusable UI components
        │   ├── common/          # Button, Input, Modal, Badge, Toast, Loader
        │   ├── layout/          # Navbar, Footer, DashboardSidebar, Header
        │   ├── product/         # ProductCard, ProductGrid, PriceDisplay, FilterSidebar
        │   ├── cart/            # CartDrawer, CartItem
        │   ├── orders/          # OrderTimeline, SubOrderCard
        │   └── ai/              # AIAssistantModal, RecommendationCard
        ├── context/             # AuthContext, CartContext, SocketContext
        ├── pages/
        │   ├── public/          # Home, Products, ProductDetails, Login, Register, VendorApply
        │   ├── buyer/           # Profile, Orders, OrderDetails, Wishlist, Addresses, Checkout
        │   ├── vendor/          # VendorDashboard, Products, ProductForm, Inventory, Orders
        │   └── admin/           # AdminDashboard, VendorsQueue, Users, Categories, Moderation, Audit
        ├── hooks/
        └── utils/
```

---

## 3. Financial and Monetary Precision Model

All monetary amounts are stored as **integer paise** (1 INR = 100 paise):
- `price`: integer (e.g., ₹1,499.00 -> `149900`)
- Order calculations, sub-order splits, platform commission, GST/tax, and Razorpay `amount` utilize integer arithmetic to guarantee zero floating point rounding errors.
- Client inputs are validated through Zod; browser-submitted totals are strictly ignored. The backend recalculates item prices, sub-orders, and commission rates directly from verified database product records.

---

## 4. Multi-Vendor Order Architecture

When a buyer checks out a cart with products from Vendor A and Vendor B:
1. **Atomic Inventory Reservation**:
   - Stock is decremented conditionally (`$gte` required quantity).
   - If stock fails on any item, previous reservations are compensated immediately.
2. **Order Hierarchy**:
   - **Parent Order**: Stores total amount, buyer reference, shipping address snapshot, global payment status, Razorpay order id.
   - **Vendor Sub-Orders**: Embedded array or linked sub-orders per vendor containing item snapshots (price at purchase, SKU, vendor ID, name), subtotal, vendor commission, vendor payout amount, and vendor-specific fulfillment status (`pending`, `confirmed`, `packed`, `shipped`, `delivered`, `cancelled`).
3. **Vendor Access Scoping**:
   - Vendors can only query and mutate their own sub-order status.
   - Status changes publish real-time Socket.IO events to the buyer's private room.

---

## 5. Development Phases & Acceptance Criteria

### Phase 1: Workspace, Project Structure, Frontend & Backend Startup
- **Scope**: Scaffold monorepo root, Express backend, React+Vite frontend, Tailwind CSS, core configuration, and health check.
- **Acceptance Criteria**:
  - `server` starts on port 5000 and responds to `GET /api/health` with `{ status: "ok", service: "SmartCart AI API" }`.
  - `client` starts on port 5173 with Tailwind styling and communicates with backend health check.
  - Root `package.json` with concurrent dev script.
  - `.gitignore`, `.env.example`, `IMPLEMENTATION_PLAN.md`, `PROGRESS.md` committed.

### Phase 2: MongoDB Connection, Models & Database Seeding
- **Scope**: 13 Mongoose models with validation, unique/compound indexes, integer paise monetary fields, and seed script with realistic demo data (electronics, fashion, home, etc.).
- **Acceptance Criteria**:
  - Database connection test passes against local MongoDB (`mongodb://127.0.0.1:27017/smartcart_ai`).
  - Seed command populates users (buyer, vendor, admin), categories, products, and addresses.
  - Admin bootstrap CLI command created.

### Phase 3: Authentication, Sessions & RBAC
- **Scope**: Secure JWT auth, bcrypt password hashing, auth/role middleware, registration, login, profile, and refresh mechanism.
- **Acceptance Criteria**:
  - Validated registration and login with protected passwords.
  - Role-based route guards for `buyer`, `vendor`, `admin`.
  - Frontend AuthContext with session restoration and persistent state.

### Phase 4: Vendor Applications & Admin Approval
- **Scope**: Vendor application workflow, store profile setup, admin approval/rejection queue.
- **Acceptance Criteria**:
  - Only approved vendors can manage products.
  - Admin can review, approve, reject, or suspend vendors with audit logging.

### Phase 5: Product Catalog, Media Management & Search
- **Scope**: Vendor product CRUD, category assignment, specifications, image handling (Cloudinary + local upload fallback), public catalog listing with text search, category/price/rating filters, sorting, and pagination.
- **Acceptance Criteria**:
  - Full-text search and faceted filters working.
  - Vendors cannot edit products belonging to other vendors.

### Phase 6: Cart, Wishlist & Saved Addresses
- **Scope**: Server-persisted cart with stock quantity checks, wishlist toggle, and multi-address management.
- **Acceptance Criteria**:
  - Cart prevents adding items exceeding current inventory.
  - Saved addresses support set-default and validation.

### Phase 7: Inventory-Safe Checkout & Multi-Vendor Orders
- **Scope**: Checkout pipeline, atomic inventory reservation, parent/sub-order generation, address & price snapshotting.
- **Acceptance Criteria**:
  - Simultaneous checkout does not oversell inventory.
  - Multi-vendor carts correctly generate segregated sub-orders.

### Phase 8: Razorpay Integration & Webhook Handling
- **Scope**: Razorpay test mode payment creation, frontend modal integration, server-side HMAC signature verification, idempotent webhook listener.
- **Acceptance Criteria**:
  - Tampered signatures rejected.
  - Successful verification updates order and payment status idempotently.

### Phase 9: Buyer, Vendor & Admin Portals
- **Scope**: Complete dashboard UI matching the reference design:
  - Buyer: Order history, tracking timeline, product reviews.
  - Vendor: Metrics, inventory manager, sub-order fulfillment.
  - Admin: System metrics, vendor management, product moderation, audit logs.
- **Acceptance Criteria**:
  - All dashboard controls are interactive with active data states.

### Phase 10: AI Shopping Assistant & Recommendation Engine
- **Scope**: Natural language query analyzer, intent & filter extraction, catalog database lookup, deterministic fallback, optional LLM explanation adapter.
- **Acceptance Criteria**:
  - Returns verified in-stock products matching queries (budget, category, specs).
  - Never hallucinates non-existent products.

### Phase 11: Real-Time Notifications & Price Alerts
- **Scope**: Socket.IO authenticated rooms, order status notifications, vendor alerts, price drops.
- **Acceptance Criteria**:
  - Room authorization prevents data leakage between users.
  - Notification history stored in MongoDB.

### Phase 12: Automated Tests & Security Verification
- **Scope**: Vitest / React Testing Library frontend tests, Supertest API tests, security checks (rate limiting, NoSQL injection prevention, XSS headers).
- **Acceptance Criteria**:
  - All test suites execute and pass.

### Phase 13: Documentation & Production Readiness
- **Scope**: Comprehensive README, API documentation, deployment guide, environment validation.
- **Acceptance Criteria**:
  - Project launches cleanly from clean clone instructions.
