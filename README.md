# Smart Resell Profit Tracker

Smart Resell Profit Tracker is a browser-based web app for tracking buy vs. market prices of resale items, calculating profit metrics, and analyzing performance with dashboards and charts.

It is built with plain HTML, CSS, and JavaScript, and demonstrates practical DSA usage in a real UI workflow.

## Features

- User authentication (signup/login/logout) using `localStorage`
- Per-user item storage and session handling
- Add, edit, delete, and clear resale items
- Real-time profit preview while adding/editing
- Dashboard cards for:
	- Total items
	- Total profit
	- Profitable items
	- Best item to sell first
	- Top 5 items by profit %
- Market price range filtering with a dual-range slider
- Sortable table columns (buying price, market price, profit, profit %)
- Analysis view with:
	- Top profits bar chart (Canvas)
	- Category profit share donut chart (Canvas)
	- Category breakdown summary
- Light/Dark theme toggle with persistence
- Recent items queue (latest 5)
- Auto-seeded starter product dataset
- Product image support using category rules + Unsplash API fallback

## DSA Concepts Used

The project uses DSA concepts directly in `script.js`:

- **Hash Map (`Map`)**
	- Primary item storage (`itemsMap`) for fast lookup/update by ID
- **Queue (Fixed-size queue)**
	- `FixedQueue` keeps latest recent items (capacity = 5)
- **Priority Queue / Max Heap**
	- `MaxHeap` powers top profitable item extraction efficiently
- **Binary Search**
	- `lowerBound`, `upperBound`, and sorted insertion for market price range filtering
- **Sorting**
	- Table sorting and category ranking operations

> Note: A custom stack implementation is **not** currently present in code.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Browser `localStorage`
- HTML Canvas API
- Unsplash API (for dynamic image fetching)

## Project Structure

- `index.html` – App layout, tabs, forms, auth UI, analysis canvases
- `style.css` – Full styling (themes, responsive layout, components)
- `script.js` – App logic, DSA classes, rendering, auth, storage, charts
- `bg-pattern.svg` – Background pattern asset

## How to Run

1. Clone or download this project.
2. Open the folder in VS Code.
3. Open `index.html` in a browser (or use Live Server).

No build tools or package installation are required.

## Default Demo Account

A seeded demo account is auto-created on load:

- **Username:** `devk`
- **Password:** `dev123`

You can also create your own account from the signup form.

## Data Persistence

The app stores data in browser `localStorage`, including:

- Auth/session state
- User accounts
- Per-user item lists
- Theme preference

Storage is local to the browser profile and machine.

## Important Notes

- Passwords are encoded with `btoa` (Base64), which is **not secure hashing** for production.
- Unsplash image fetching depends on network availability.
- This project is ideal as a DSA + frontend learning project, not as a production-ready secure app.

## Future Improvements (Optional)

- Replace client-side auth with secure backend authentication
- Use strong password hashing (e.g., bcrypt on server)
- Add unit tests for DSA utilities and business logic
- Add pagination/virtualization for very large datasets
- Add export/import (CSV/JSON)
