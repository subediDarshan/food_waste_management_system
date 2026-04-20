# Food Waste Management System

A full-stack Node.js + MongoDB demo for connecting **food donors** with **NGOs** that collect surplus food. Built to showcase MongoDB CRUD operations, indexing, query operators, projection, sorting, pagination, and role-based access control — backed by MongoDB Atlas.

---

## Tech Stack

| Layer       | Tech                                              |
|-------------|---------------------------------------------------|
| Backend     | Node.js, Express.js                               |
| Database    | MongoDB Atlas (Mongoose ODM)                      |
| Auth        | `express-session` + bcrypt-hashed passwords (no JWT) |
| Frontend    | Plain HTML, CSS, vanilla JavaScript (no frameworks) |

---

## Folder Structure

```
food_waste_management_system/
├── server.js                  # App entry point
├── package.json
├── .env.example               # Copy → .env and fill MONGO_URI
├── config/
│   └── db.js                  # Mongoose connection
├── middleware/
│   └── auth.js                # requireAuth + requireRole
├── models/
│   ├── User.js                # name, email (unique idx), password, role
│   ├── FoodListing.js         # title, qty, expiryTime (idx), location (idx), compound idx
│   └── Claim.js               # foodId, NGOId, claimStatus
├── routes/
│   ├── auth.js                # signup / login / logout / me
│   ├── food.js                # CRUD + browse with filters/projection/sort/pagination
│   ├── claims.js              # NGO claim flow + donor approve/reject
│   └── analytics.js           # countDocuments() dashboards + index inspection
└── public/                    # Static frontend
    ├── index.html             # Login + signup
    ├── donor-dashboard.html   # Donor stats
    ├── add-food.html          # Donor: create listing
    ├── my-listings.html       # Donor: list/delete
    ├── donor-claims.html      # Donor: approve/reject claims
    ├── ngo-dashboard.html     # NGO stats
    ├── browse-food.html       # NGO: filter/sort/paginate listings
    ├── my-claims.html         # NGO: claim history
    ├── css/styles.css
    └── js/common.js
```

---

## Schema Design

### Users
| Field    | Type   | Notes                       |
|----------|--------|-----------------------------|
| name     | String | required                    |
| email    | String | required, **unique index**  |
| password | String | bcrypt hashed               |
| role     | String | `donor` or `ngo`            |

### FoodListings
| Field      | Type     | Notes                                                       |
|------------|----------|-------------------------------------------------------------|
| title      | String   |                                                             |
| quantity   | Number   |                                                             |
| expiryTime | Date     | **single-field index**                                      |
| location   | String   | **single-field index**                                      |
| createdBy  | ObjectId | ref → User                                                  |
| status     | String   | `available` / `claimed` / `expired`                         |

Plus a **compound index on `{ location: 1, expiryTime: 1 }`** to optimise location-scoped expiry queries.

### Claims
| Field       | Type     | Notes                                  |
|-------------|----------|----------------------------------------|
| foodId      | ObjectId | ref → FoodListing (indexed)            |
| NGOId       | ObjectId | ref → User (indexed)                   |
| claimStatus | String   | `pending` / `approved` / `rejected`    |

---

## MongoDB Features Demonstrated

| Concept                       | Where                                                                                  |
|------------------------------|----------------------------------------------------------------------------------------|
| `find()` / `findOne()`       | All routes (e.g. `routes/auth.js`, `routes/food.js`)                                   |
| AND filter (location + status) | `GET /api/food/browse` with `location` + default `status: available`                |
| OR filter                    | `GET /api/food/browse?locations=Mumbai,Pune` → `$or` with multiple location clauses    |
| IN operator                  | `GET /api/food/browse?statuses=available,claimed` → `status: { $in: [...] }`           |
| Projection                   | `routes/food.js` — `find(filter, 'title quantity expiryTime location status …')`       |
| Sorting                      | `.sort({ expiryTime: 1 })` (ascending — soonest first) on the browse endpoint          |
| Pagination                   | `.skip((page-1)*limit).limit(limit)` on browse endpoint                                |
| `$set` updates               | `routes/food.js` PUT, `routes/claims.js` PUT                                           |
| Update many                  | `POST /api/food/maintenance/expire` flips all expired listings via `updateMany()`      |
| Status transitions           | available → claimed (on approve) ; available → expired (sweep)                         |
| `countDocuments()` analytics | `routes/analytics.js` (no aggregation pipelines used)                                  |
| Single-field indexes         | `expiryTime`, `location` in `models/FoodListing.js`                                    |
| Compound index               | `{ location: 1, expiryTime: 1 }` in `models/FoodListing.js`                            |
| Unique index                 | `email` in `models/User.js`                                                            |

---

## Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Configure MongoDB Atlas
Copy the env template and add your Atlas connection string:
```bash
cp .env.example .env
```
Edit `.env`:
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/foodwaste?retryWrites=true&w=majority
SESSION_SECRET=any-long-random-string
PORT=3000
```

> **Atlas tip:** make sure your IP is whitelisted in **Network Access** and the DB user has `readWrite` on the `foodwaste` database.

### 3. Start the server
```bash
npm start
# or for auto-reload during development
npm run dev
```

Open **http://localhost:3000** in your browser.

> Mongoose creates all model-defined indexes automatically on first connection.

---

## Demonstration Plan

1. **Sign up two users** — one as a `donor`, one as an `ngo` (open in two browsers / private windows so sessions don't collide).
2. As the **donor**, add 3–4 food listings with different locations (Mumbai, Pune, Delhi) and expiry times.
3. Switch to the **NGO** browser:
   - Open **Browse Food** and demonstrate filters:
     - Single location → AND filter
     - Multiple locations comma-separated → OR query (`$or`)
     - Multiple statuses comma-separated → IN query (`$in`)
     - "Expires within (hours)" → range filter on indexed `expiryTime`
   - Note the listings are sorted by **expiryTime ascending** (soonest first).
   - Use the **Page size** dropdown + Prev/Next to demo `skip`/`limit` pagination.
   - Click **Claim** on an available listing.
4. Back as the **donor** — open **Claims** and approve/reject. Approval triggers:
   - `Claim` doc `$set: { claimStatus: 'approved' }`
   - `FoodListing` doc `$set: { status: 'claimed' }`
   - All other pending claims for the same listing → auto-rejected via `updateMany()`.
5. On **My Listings** click **Run Expire Sweep** → fires `updateMany()` flipping past-expiry listings to `expired`.
6. Watch the **dashboards** update for both roles — all powered by `countDocuments()` + `find()` with projections, **no aggregation pipelines**.
7. Verify indexes in **MongoDB Atlas → Browse Collections → Indexes tab** for each collection:
   - `foodlistings`: `expiryTime_1`, `location_1`, `location_1_expiryTime_1`
   - `users`: `email_1` (unique)

---

## API Reference (quick)

| Method | Path                                     | Role  | Purpose                                  |
|--------|------------------------------------------|-------|------------------------------------------|
| POST   | `/api/auth/signup`                       | —     | Create account                           |
| POST   | `/api/auth/login`                        | —     | Login                                    |
| POST   | `/api/auth/logout`                       | any   | End session                              |
| GET    | `/api/auth/me`                           | any   | Current session info                     |
| POST   | `/api/food`                              | donor | Create listing                           |
| GET    | `/api/food/mine`                         | donor | Donor's own listings                     |
| GET    | `/api/food/browse`                       | ngo   | Browse with filters/projection/pag       |
| GET    | `/api/food/:id`                          | any   | Listing detail                           |
| PUT    | `/api/food/:id`                          | donor | Update via `$set`                        |
| DELETE | `/api/food/:id`                          | donor | Delete listing + cascade claims          |
| POST   | `/api/food/maintenance/expire`           | any   | `updateMany()` to expire stale listings  |
| POST   | `/api/claims`                            | ngo   | Claim a listing                          |
| GET    | `/api/claims/mine`                       | ngo   | NGO's claim history                      |
| GET    | `/api/claims/for-my-listings`            | donor | Claims on donor's listings               |
| PUT    | `/api/claims/:id`                        | donor | Approve or reject (`$set`)               |
| GET    | `/api/analytics/donor`                   | donor | Donor counts                             |
| GET    | `/api/analytics/ngo`                     | ngo   | NGO counts                               |

---

## Notes

- Authentication is intentionally **session-based, no JWT** — the `User` collection is the source of truth and `express-session` keeps `userId` + `role` in a signed cookie.
- All analytics use plain `countDocuments()` and `find()` — **no `aggregate()` calls anywhere** — so the queries map cleanly to the indexes.
- Use **MongoDB Atlas → Browse Collections → Indexes tab** to verify the indexes Mongoose created from the model definitions.
