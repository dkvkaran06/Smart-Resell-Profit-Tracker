class FixedQueue {
    constructor(limit = 5) {
        this.limit = limit;
        this.items = [];
    }
    enqueue(value) {
        this.items.push(value);
        if (this.items.length > this.limit) this.items.shift();
    }
    dequeue() {
        return this.items.length ? this.items.shift() : null;
    }
    peek() {
        return this.items.length ? this.items[0] : null;
    }
    toArrayNewestFirst() {
        return [...this.items].reverse();
    }
    toArrayOldestFirst() {
        return [...this.items];
    }
    setItems(values) {
        this.items = Array.isArray(values) ? values.slice(-this.limit) : [];
    }
    clear() {
        this.items = [];
    }
}

class MaxHeap {
    constructor() {
        this.heap = [];
    }
    compare(a, b) {
        if (a.profitPercent !== b.profitPercent) return a.profitPercent - b.profitPercent;
        return a.profit - b.profit;
    }
    push(value) {
        this.heap.push(value);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (!this.heap.length) return null;
        if (this.heap.length === 1) return this.heap.pop();
        const top = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return top;
    }
    bubbleUp(index) {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parent]) <= 0) break;
            [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
            index = parent;
        }
    }
    bubbleDown(index) {
        const size = this.heap.length;
        while (true) {
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            let largest = index;
            if (left < size && this.compare(this.heap[left], this.heap[largest]) > 0) largest = left;
            if (right < size && this.compare(this.heap[right], this.heap[largest]) > 0) largest = right;
            if (largest === index) break;
            [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
            index = largest;
        }
    }
}

class ResellTracker {
    constructor() {
        this.itemsMap = new Map();
        this.recentQueue = new FixedQueue(5);
        this.sortedByMarket = [];
        this.nextId = 1;
    }

    calculateMetrics(buyingPrice, marketPrice) {
        const profit = marketPrice - buyingPrice;
        const profitPercent = buyingPrice === 0 ? 0 : (profit / buyingPrice) * 100;
        return { profit, profitPercent };
    }

    addItem({ name, category, buyingPrice, marketPrice, imageUrl = "" }) {
        const id = this.nextId++;
        const { profit, profitPercent } = this.calculateMetrics(buyingPrice, marketPrice);
        const item = { id, name, category, buyingPrice, marketPrice, profit, profitPercent, imageUrl, createdAt: Date.now() };
        this.itemsMap.set(id, item);
        this.recentQueue.enqueue(item);
        this.insertSortedByMarket(item);
        this.saveToStorage();
        return item;
    }

    removeItem(id) {
        const item = this.itemsMap.get(id);
        if (!item) return;
        this.itemsMap.delete(id);
        const idx = this.sortedByMarket.findIndex((x) => x.id === id);
        if (idx !== -1) this.sortedByMarket.splice(idx, 1);
        this.recentQueue.setItems(this.recentQueue.items.filter((x) => x && x.id !== id));
        this.saveToStorage();
    }

    clearAll() {
        this.itemsMap.clear();
        this.recentQueue.clear();
        this.sortedByMarket = [];
        this.nextId = 1;
        this.saveToStorage();
    }

    insertSortedByMarket(item) {
        let low = 0;
        let high = this.sortedByMarket.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedByMarket[mid].marketPrice < item.marketPrice) low = mid + 1;
            else high = mid;
        }
        this.sortedByMarket.splice(low, 0, item);
    }

    lowerBound(price) {
        let low = 0;
        let high = this.sortedByMarket.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedByMarket[mid].marketPrice < price) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    upperBound(price) {
        let low = 0;
        let high = this.sortedByMarket.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedByMarket[mid].marketPrice <= price) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    filterByMarketRange(minPrice, maxPrice) {
        if (!this.sortedByMarket.length) return [];
        const left = this.lowerBound(minPrice);
        const right = this.upperBound(maxPrice);
        return this.sortedByMarket.slice(left, right);
    }

    getTopItems(limit = 5) {
        const heap = new MaxHeap();
        this.getAllItems().forEach((item) => heap.push(item));
        const top = [];
        while (top.length < limit) {
            const current = heap.pop();
            if (!current) break;
            top.push(current);
        }
        return top;
    }

    getBestItem() {
        return this.getTopItems(1)[0] || null;
    }

    getAllItems() {
        return Array.from(this.itemsMap.values()).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
    }

    getStats() {
        const items = this.getAllItems();
        const totalItems = items.length;
        let totalProfit = 0;
        let totalInvestment = 0;
        let totalMarketValue = 0;
        let profitableItems = 0;
        let lossItems = 0;
        let sumProfitPercent = 0;

        for (const item of items) {
            totalProfit += item.profit;
            totalInvestment += item.buyingPrice;
            totalMarketValue += item.marketPrice;
            sumProfitPercent += item.profitPercent;
            if (item.profit > 0) profitableItems++;
            if (item.profit < 0) lossItems++;
        }

        return {
            totalItems,
            totalProfit,
            totalInvestment,
            totalMarketValue,
            profitableItems,
            lossItems,
            avgProfitPercent: totalItems ? sumProfitPercent / totalItems : 0,
        };
    }

    getCategoryBreakdown() {
        const map = new Map();
        for (const item of this.itemsMap.values()) {
            if (!map.has(item.category)) {
                map.set(item.category, { count: 0, totalProfit: 0 });
            }
            const group = map.get(item.category);
            group.count += 1;
            group.totalProfit += item.profit;
        }
        return map;
    }

    saveToStorage() {
        const payload = {
            nextId: this.nextId,
            items: this.getAllItems(),
            recent: this.recentQueue.items,
        };
        localStorage.setItem("smartResellTrackerData", JSON.stringify(payload));
    }

    loadFromStorage() {
        const raw = localStorage.getItem("smartResellTrackerData");
        if (!raw) return false;
        try {
            const parsed = JSON.parse(raw);
            const parsedItems = Array.isArray(parsed?.items) ? parsed.items : [];
            this.nextId = Number(parsed?.nextId) > 0 ? Number(parsed.nextId) : 1;
            this.itemsMap.clear();
            this.sortedByMarket = [];
            for (const item of parsedItems) {
                if (!item || typeof item.id !== "number") continue;
                this.itemsMap.set(item.id, item);
                this.insertSortedByMarket(item);
            }
            this.recentQueue.setItems(parsed?.recent);
            return this.itemsMap.size > 0;
        } catch (error) {
            localStorage.removeItem("smartResellTrackerData");
            this.itemsMap.clear();
            this.sortedByMarket = [];
            this.recentQueue.clear();
            this.nextId = 1;
            return false;
        }
    }
}

const TRACKER_STORAGE_KEY = "smartResellTrackerData";
const tracker = new ResellTracker();
const THEME_STORAGE_KEY = "smartResellTheme";
const UNSPLASH_ACCESS_KEY = "vuM_eHGpXd3491bNLg3uHRDVVQjYx8e8nv0B-eANA7s";

const defaultProducts = [
    { name: "iPhone 12 (128GB)", category: "Electronics", buyingPrice: 28500, marketPrice: 33500 },
    { name: "Samsung 32-inch Monitor", category: "Electronics", buyingPrice: 7200, marketPrice: 9100 },
    { name: "Study Table (Wood)", category: "Furniture", buyingPrice: 2600, marketPrice: 3400 },
    { name: "Nike Running Shoes", category: "Fashion", buyingPrice: 2200, marketPrice: 3100 },
    { name: "Mountain Bicycle", category: "Sports", buyingPrice: 6400, marketPrice: 7600 },
    { name: "Engineering Book Set", category: "Books", buyingPrice: 1800, marketPrice: 2400 },
    { name: "Bluetooth Speaker", category: "Electronics", buyingPrice: 1500, marketPrice: 2300 },
    { name: "Office Chair", category: "Furniture", buyingPrice: 2900, marketPrice: 3600 },
    { name: "Cricket Kit", category: "Sports", buyingPrice: 3100, marketPrice: 2950 },
    { name: "Denim Jacket", category: "Fashion", buyingPrice: 1100, marketPrice: 1700 },
    { name: "PlayStation 4 Console", category: "Electronics", buyingPrice: 14500, marketPrice: 18200 },
    { name: "Kindle Paperwhite", category: "Electronics", buyingPrice: 6200, marketPrice: 7800 },
];

function seedDefaultProductsIfNeeded() {
    if (tracker.itemsMap.size > 0) return;
    defaultProducts.forEach((product) => tracker.addItem(product));
}

function itemSignature(item) {
    return [
        String(item.name || "").trim().toLowerCase(),
        String(item.category || "").trim().toLowerCase(),
        Number(item.buyingPrice),
        Number(item.marketPrice),
    ].join("::");
}

function ensureDefaultProducts() {
    if (tracker.itemsMap.size === 0) {
        seedDefaultProductsIfNeeded();
        return;
    }

    const existingSignatures = new Set(tracker.getAllItems().map((item) => itemSignature(item)));
    let addedAny = false;

    for (const product of defaultProducts) {
        const signature = itemSignature(product);
        if (existingSignatures.has(signature)) continue;
        tracker.addItem(product);
        existingSignatures.add(signature);
        addedAny = true;
    }

    if (addedAny) tracker.saveToStorage();
}

const currency = (num) => `₹${Number(num).toFixed(2)}`;
const percent = (num) => `${Number(num).toFixed(2)}%`;

function timeAgo(timestamp) {
    if (!timestamp) return "just now";
    const seconds = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

const categoryKeywordMap = {
    Electronics: "electronics,gadget",
    Furniture: "furniture",
    Fashion: "fashion,clothing",
    Books: "books",
    Sports: "sports,equipment",
    Other: "product",
};

const itemKeywordRules = [
    { test: /\b(diamond|ring|jewel|jewellery|jewelry)\b/i, keyword: "diamond,jewelry,gemstone" },
    { test: /\bbutton(s)?\b/i, keyword: "sewing button macro,isolated" },
    { test: /mobile cover|phone cover|phone case|case/i, keyword: "phone case,mobile cover" },
    { test: /bouquet|flower|floral/i, keyword: "flower bouquet" },
    { test: /iphone|phone|mobile/i, keyword: "iphone,smartphone" },
    { test: /monitor|display|screen/i, keyword: "computer,monitor" },
    { test: /study table|table|desk/i, keyword: "wooden,study,table" },
    { test: /chair/i, keyword: "office,chair" },
    { test: /denim|jacket/i, keyword: "denim,jacket" },
    { test: /shoe|shoes|sneaker/i, keyword: "running,shoes" },
    { test: /bicycle|bike|cycle/i, keyword: "mountain,bicycle" },
    { test: /book|book set/i, keyword: "books,stack" },
    { test: /speaker/i, keyword: "bluetooth,speaker" },
    { test: /cricket|kit/i, keyword: "cricket,kit" },
];

const itemImageRules = [
    {
        test: /\b(diamond|ring|jewel|jewellery|jewelry)\b/i,
        url: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /\bbutton(s)?\b/i,
        url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /mobile cover|phone cover|phone case|case/i,
        url: "https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /bouquet|flower|floral/i,
        url: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /iphone|phone|mobile/i,
        url: "https://images.unsplash.com/photo-1603891128711-11b4b03bb138?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /monitor|display|screen/i,
        url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /study table|table|desk/i,
        url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /chair/i,
        url: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /denim|jacket/i,
        url: "https://images.unsplash.com/photo-1548883354-94bcfe321cbb?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /shoe|shoes|sneaker/i,
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /bicycle|bike|cycle/i,
        url: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /book|book set/i,
        url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /speaker/i,
        url: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /cricket|kit/i,
        url: "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /disk|hard disk|hdd|ssd|drive/i,
        url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80",
    },
    {
        test: /dabba|box|storage|container/i,
        url: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=500&q=80",
    },
];

const categoryImageMap = {
    Electronics: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=500&q=80",
    Furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80",
    Fashion: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=500&q=80",
    Books: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=500&q=80",
    Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=500&q=80",
    Other: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=500&q=80",
};

const categoryIconMap = {
    Electronics: "💻",
    Furniture: "🪑",
    Fashion: "👕",
    Books: "📚",
    Sports: "🏅",
    Other: "📦",
};

function getItemKeyword(item) {
    const itemName = String(item.name || "");
    const matchedRule = itemKeywordRules.find((rule) => rule.test.test(itemName));
    if (matchedRule) return matchedRule.keyword;
    return categoryKeywordMap[item.category] || categoryKeywordMap.Other;
}

function getItemIcon(item) {
    return categoryIconMap[item.category] || categoryIconMap.Other;
}

function createFallbackThumbSrc(item) {
        const icon = getItemIcon(item);
        const label = String(item.name || "Item").slice(0, 20);
        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}">
    <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ecf6ff"/>
            <stop offset="100%" stop-color="#dff1e8"/>
        </linearGradient>
    </defs>
    <rect x="2" y="2" width="92" height="92" rx="18" fill="url(#g)" stroke="#cfdcf0" stroke-width="2"/>
    <text x="48" y="54" text-anchor="middle" font-size="34">${icon}</text>
</svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getItemImageSrc(item, size) {
    const itemName = String(item.name || "");
    
    // Priority 1: Check itemImageRules for exact match
    const matchedRule = itemImageRules.find((rule) => rule.test.test(itemName));
    if (matchedRule && matchedRule.url) return matchedRule.url;
    
    // Priority 2: Check categoryImageMap
    if (categoryImageMap[item.category]) return categoryImageMap[item.category];
    
    // Priority 3: Fallback to generic category image
    return categoryImageMap.Other;
}

function itemThumbMarkup(item, extraClass = "") {
    const isLarge = extraClass.includes("item-thumb-lg");
    const fallback = createFallbackThumbSrc(item);
    const genericSources = new Set([
        categoryImageMap.Other,
        ...(Object.values(categoryImageMap)),
        ...(itemImageRules.map((rule) => rule.url).filter(Boolean)),
    ]);
    const hasCustomImage = Boolean(item.imageUrl) && !genericSources.has(item.imageUrl);
    const src = hasCustomImage ? item.imageUrl : getItemImageSrc(item, isLarge ? "lg" : "sm");
    return `<img src="${src}" alt="${item.name}" class="item-thumb ${extraClass}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">`;
}

async function fetchUnsplashImage(query, category = "") {
    const textQuery = String(query || "product").trim() || "product";
    const categoryQuery = String(category || "").trim();
    const keywordRule = itemKeywordRules.find((rule) => rule.test.test(textQuery));
    const focusedQuery = keywordRule?.keyword || textQuery;
    const searchQuery = keywordRule ? focusedQuery : [focusedQuery, categoryQuery].filter(Boolean).join(" ");
    
    // Priority 1: Check if it matches itemImageRules
    const matchedRule = itemImageRules.find((rule) => rule.test.test(textQuery));
    if (matchedRule && matchedRule.url) {
        return matchedRule.url;
    }

    // Priority 2: Unsplash API random photo with query
    try {
        const endpoint = new URL("https://api.unsplash.com/photos/random");
        endpoint.searchParams.set("query", searchQuery || "product");
        endpoint.searchParams.set("orientation", "squarish");
        endpoint.searchParams.set("content_filter", "high");

        const response = await fetch(endpoint.toString(), {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
                "Accept-Version": "v1",
            },
        });

        if (response.ok) {
            const data = await response.json();
            const apiUrl = data?.urls?.small || data?.urls?.regular || data?.urls?.thumb;
            if (apiUrl) return apiUrl;
        }
    } catch (error) {
        // Intentionally ignore and use fallback URL below
    }

    // Priority 3: Dynamic Unsplash source fallback with unique signature
    const encoded = encodeURIComponent(searchQuery || textQuery);
    const sig = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    return `https://source.unsplash.com/600x600/?${encoded}&sig=${sig}`;
}

function statusType(item) {
    if (item.profit > 0) return "profit";
    if (item.profit < 0) return "loss";
    return "break";
}

function statusText(item) {
    if (item.profit > 0) return "Profitable";
    if (item.profit < 0) return "Loss";
    return "Break-even";
}

function switchView(view) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
    document.querySelectorAll(".view").forEach((panel) => panel.classList.toggle("active", panel.id === `view-${view}`));
    if (view === "analysis") drawAnalysisCharts();
}

function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-theme", dark);
    if (themeToggleButton) {
        themeToggleButton.textContent = dark ? "☀️" : "🌙";
    }
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    drawAnalysisCharts();
}

document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
});

function renderBestItem() {
    const best = tracker.getBestItem();
    const container = document.getElementById("best-item");
    if (!best) {
        container.innerHTML = "<p class='muted'>No items yet.</p>";
        return;
    }

    const statusClass = best.profit >= 0 ? "money-profit" : "money-loss";

    container.innerHTML = `
        <div class="list-item top-seller-card">
            <div class="top-seller-badge">🔥 Top Profit</div>
            <div class="item-row top-seller-main">
                <div class="top-seller-info">
                    <div class="top-seller-title"><strong>${best.name}</strong> <span class="muted">(${best.category})</span></div>
                    <div class="top-seller-line">Buy: <span class="muted-strong">${currency(best.buyingPrice)}</span></div>
                    <div class="top-seller-line">Market: <span class="muted-strong">${currency(best.marketPrice)}</span></div>
                </div>
                ${itemThumbMarkup(best, "item-thumb-lg")}
            </div>

            <div class="top-seller-metrics">
                <div class="metric-col">
                    <span class="muted">Buying:</span>
                    <strong>${currency(best.buyingPrice)}</strong>
                </div>
                <div class="metric-col">
                    <span class="muted">Profit:</span>
                    <strong class="${statusClass}">${currency(best.profit)}</strong>
                </div>
                <div class="metric-col">
                    <span class="muted">Market:</span>
                    <strong>${currency(best.marketPrice)}</strong>
                </div>
                <div class="metric-col">
                    <span class="muted">Profit %:</span>
                    <strong class="${statusClass}">${percent(best.profitPercent)}</strong>
                </div>
            </div>

            <div class="top-seller-footer">
                <div class="item-row">
                    ${itemThumbMarkup(best, "item-thumb-sm")}
                    <div>
                        <strong>${best.name}</strong> <span class="muted">(${best.category})</span>
                        <div class="muted">Buy: ${currency(best.buyingPrice)} | Market: ${currency(best.marketPrice)}</div>
                    </div>
                    <span class="seller-time">${timeAgo(best.createdAt)}</span>
                </div>
            </div>

            <div class="top-seller-actions">
                <button class="btn danger top-seller-sell-btn" type="button" data-sell-id="${best.id}">Sell Now</button>
            </div>
        </div>
    `;

    const sellButton = container.querySelector("[data-sell-id]");
    if (!sellButton) return;

    sellButton.addEventListener("click", () => {
        const sellId = Number(sellButton.dataset.sellId);
        const soldItem = tracker.itemsMap.get(sellId);
        if (!soldItem) return;
        tracker.removeItem(sellId);
        persistCurrentUserItems();
        renderAll();
        alert(`${soldItem.name} sold successfully!`);
    });
}

function renderRecentItems() {
    const items = tracker.recentQueue.toArrayNewestFirst();
    const container = document.getElementById("recent-items");
    if (!items.length) {
        container.innerHTML = "<p class='muted'>No recent items.</p>";
        return;
    }
    container.innerHTML = items.map((item) => `
        <div class="list-item recent-item">
            <div class="recent-left">
                <div class="recent-left-row">
                    ${itemThumbMarkup(item, "item-thumb-sm")}
                    <div>
                        <div><strong>${item.name}</strong> - ${currency(item.marketPrice)}</div>
                        <div class="muted">${item.category} • ${percent(item.profitPercent)}</div>
                    </div>
                </div>
            </div>
            <div class="recent-right">
                <span class="recent-pill recent-time">${timeAgo(item.createdAt)}</span>
                <span class="recent-pill ${item.profitPercent >= 0 ? "recent-profit" : "recent-loss"}">
                    ${item.profitPercent >= 0 ? "▲" : "▼"} ${percent(Math.abs(item.profitPercent))}
                </span>
            </div>
        </div>
    `).join("");
}

function renderStats() {
    const stats = tracker.getStats();
    document.getElementById("total-items").textContent = stats.totalItems;
    document.getElementById("total-profit").textContent = currency(stats.totalProfit);
    document.getElementById("profitable-items").textContent = stats.profitableItems;

    const avgProfit = document.getElementById("avg-profit");
    const lossItems = document.getElementById("loss-items");
    const investVsMarket = document.getElementById("invest-vs-market");
    if (avgProfit) avgProfit.textContent = percent(stats.avgProfitPercent);
    if (lossItems) lossItems.textContent = stats.lossItems;
    if (investVsMarket) investVsMarket.textContent = `${currency(stats.totalInvestment)} / ${currency(stats.totalMarketValue)}`;

    document.getElementById("total-profit").className = stats.totalProfit >= 0 ? "value money-profit" : "value money-loss";

    const analysisAvgProfit = document.getElementById("analysis-avg-profit");
    const analysisLossItems = document.getElementById("analysis-loss-items");
    const analysisTotalInvestment = document.getElementById("analysis-total-investment");
    if (analysisAvgProfit) analysisAvgProfit.textContent = percent(stats.avgProfitPercent);
    if (analysisLossItems) analysisLossItems.textContent = stats.lossItems;
    if (analysisTotalInvestment) analysisTotalInvestment.textContent = currency(stats.totalInvestment);
}

let tableSortState = { column: null, ascending: true };

function getAllItemsQueueOrder() {
    return tracker.getAllItems().slice().reverse();
}

function renderAllItemsTable(sortedItems = null) {
    const body = document.getElementById("all-items-body");
    const items = sortedItems || getAllItemsQueueOrder();
    if (!items.length) {
        body.innerHTML = "<tr><td colspan='8' class='muted'>No items added yet.</td></tr>";
        return;
    }
    body.innerHTML = items.map((item) => `
        <tr data-item-id="${item.id}">
            <td>
                <div class="item-cell">
                    ${itemThumbMarkup(item, "item-thumb-sm")}
                    <span>${item.name}</span>
                </div>
            </td>
            <td><span class="category-badge">${item.category}</span></td>
            <td>${currency(item.buyingPrice)}</td>
            <td>${currency(item.marketPrice)}</td>
            <td class="profit-cell ${item.profit >= 0 ? "profit-positive" : "profit-negative"}">${currency(item.profit)}</td>
            <td class="${item.profitPercent >= 0 ? "money-profit" : "money-loss"}">${percent(item.profitPercent)}</td>
            <td><span class="status ${statusType(item)}">${statusText(item)}</span></td>
            <td>
                <div class="action-menu-wrapper">
                    <button class="action-menu-trigger" data-item-id="${item.id}">⋮</button>
                    <div class="action-menu">
                        <button class="action-menu-item action-edit" data-edit-id="${item.id}">✏️ Edit</button>
                        <button class="action-menu-item action-delete" data-delete-id="${item.id}">🗑️ Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join("");

    body.querySelectorAll("[data-delete-id]").forEach((button) => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = Number(button.dataset.deleteId);
            const row = body.querySelector(`tr[data-item-id="${id}"]`);
            if (row) {
                row.classList.add("row-deleting");
                setTimeout(() => {
                    tracker.removeItem(id);
                    persistCurrentUserItems();
                    renderAll();
                }, 300);
            }
        });
    });

    body.querySelectorAll("[data-edit-id]").forEach((button) => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = Number(button.dataset.editId);
            const item = tracker.itemsMap.get(id);
            if (!item) return;

            document.getElementById("edit-item-name").value = item.name;
            document.getElementById("edit-item-category").value = item.category;
            document.getElementById("edit-buying-price").value = item.buyingPrice;
            document.getElementById("edit-market-price").value = item.marketPrice;
            document.getElementById("edit-modal").style.display = "flex";
            document.getElementById("edit-form").dataset.editId = id;
            updateEditItemPreview();
        });
    });

    // Action menu toggle
    body.querySelectorAll(".action-menu-trigger").forEach((trigger) => {
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const menu = trigger.nextElementSibling;
            const isOpen = menu.classList.contains("show");
            
            // Close all menus
            document.querySelectorAll(".action-menu.show").forEach(m => m.classList.remove("show"));
            
            // Toggle current menu
            if (!isOpen) {
                menu.classList.add("show");
            }
        });
    });

    // Close menus on outside click
    document.addEventListener("click", () => {
        document.querySelectorAll(".action-menu.show").forEach(m => m.classList.remove("show"));
    });
    
    // Initialize sortable columns
    initializeSortableColumns();
}

function initializeSortableColumns() {
    document.querySelectorAll(".sortable").forEach(th => {
        th.replaceWith(th.cloneNode(true)); // Remove old listeners
    });
    
    document.querySelectorAll(".sortable").forEach(th => {
        th.addEventListener("click", () => {
            sortTable(th.dataset.sort);
        });
    });
}

function sortTable(column) {
    const items = getAllItemsQueueOrder();
    
    if (tableSortState.column === column) {
        tableSortState.ascending = !tableSortState.ascending;
    } else {
        tableSortState.column = column;
        tableSortState.ascending = true;
    }

    const sorted = [...items].sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return tableSortState.ascending ? result : -result;
    });

    renderAllItemsTable(sorted);
    updateSortIcons();
}

function updateSortIcons() {
    document.querySelectorAll(".sortable").forEach(th => {
        const icon = th.querySelector(".sort-icon");
        const column = th.dataset.sort;
        
        if (column === tableSortState.column) {
            icon.textContent = tableSortState.ascending ? "▲" : "▼";
            th.classList.add("sorted");
        } else {
            icon.textContent = "";
            th.classList.remove("sorted");
        }
    });
}

function renderFilterResults(items, minPrice = null, maxPrice = null) {
    const wrapper = document.getElementById("filter-results");
    const showRangeMessage = typeof minPrice === "number" && typeof maxPrice === "number";
    const rangeText = showRangeMessage
        ? `Showing ${items.length} results between ${currency(minPrice)} - ${Number.isFinite(maxPrice) ? currency(maxPrice) : "₹∞"}`
        : "";

    if (!items.length) {
        wrapper.innerHTML = `
            ${showRangeMessage ? `<p class="filter-summary">${rangeText}</p>` : ""}
            <p class='muted'>No items found in this market price range.</p>
        `;
        return;
    }
    wrapper.innerHTML = `
        ${showRangeMessage ? `<p class="filter-summary">${rangeText}</p>` : ""}
        <div style="overflow:auto;">
            <table>
                <thead>
                    <tr>
                        <th>Name</th><th>Category</th><th>Market Price</th><th>Profit %</th><th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item) => `
                        <tr>
                            <td>
                                <div class="item-cell">
                                    ${itemThumbMarkup(item, "item-thumb-sm")}
                                    <span>${item.name}</span>
                                </div>
                            </td>
                            <td>${item.category}</td>
                            <td>${currency(item.marketPrice)}</td>
                            <td class="${item.profitPercent >= 0 ? "money-profit" : "money-loss"}">${percent(item.profitPercent)}</td>
                            <td><span class="status ${statusType(item)}">${statusText(item)}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderCategoryBreakdown() {
    const container = document.getElementById("category-breakdown");
    const map = tracker.getCategoryBreakdown();
    if (!map.size) {
        container.innerHTML = "<p class='muted'>No category data available.</p>";
        return;
    }
    const rows = Array.from(map.entries()).sort((a, b) => b[1].totalProfit - a[1].totalProfit);
    container.innerHTML = rows.map(([category, data]) => `
        <div class="list-item">
            <strong>${category}</strong><br>
            Items: ${data.count} • Total Profit: <span class="${data.totalProfit >= 0 ? "money-profit" : "money-loss"}">${currency(data.totalProfit)}</span>
        </div>
    `).join("");
}

function renderTopFive() {
    const container = document.getElementById("top-five");
    const top = tracker.getTopItems(5);
    if (!top.length) {
        container.innerHTML = "<p class='muted'>No items yet.</p>";
        return;
    }
    container.innerHTML = top.map((item, idx) => `
        <div class="list-item">
            <div class="item-row">
                ${itemThumbMarkup(item, "item-thumb-sm")}
                <div>
                    <strong>#${idx + 1} ${item.name}</strong> (${item.category})<br>
                    Profit: <span class="${item.profit >= 0 ? "money-profit" : "money-loss"}">${currency(item.profit)}</span>
                    • ${percent(item.profitPercent)}
                </div>
            </div>
        </div>
    `).join("");
}

function drawProfitChart() {
    const top = tracker.getTopItems(5);
    const canvas = document.getElementById("profit-canvas");
    const ctx = canvas.getContext("2d");
    const isDark = document.body.classList.contains("dark-theme");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
    ctx.font = "13px Segoe UI";

    if (!top.length) {
        ctx.fillText("No data to draw chart.", 12, 24);
        return;
    }

    const maxAbs = Math.max(...top.map((x) => Math.max(Math.abs(x.profit), 1)));
    const bottomY = canvas.height - 40;
    const chartHeight = bottomY - 50;
    const barWidth = 50;
    const gap = 25;
    const startX = 40;

    top.forEach((item, idx) => {
        const x = startX + idx * (barWidth + gap);
        const height = Math.max((Math.abs(item.profit) / maxAbs) * chartHeight, 2);
        const y = bottomY - height;
        const valueText = currency(item.profit);
        
        // Draw bar
        ctx.fillStyle = item.profit >= 0 ? "#22c55e" : "#ef4444";
        ctx.fillRect(x, y, barWidth, height);
        
        // Draw profit value on top of bar
        ctx.fillStyle = isDark ? "#e2e8f0" : "#0f172a";
        ctx.textAlign = "center";
        ctx.font = "bold 13px Segoe UI";
        ctx.fillText(valueText, x + barWidth / 2, y - 8);
        
        // Draw item name at bottom (straight text)
        ctx.font = "12px Segoe UI";
        ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";
        const itemName = item.name.length > 10 ? item.name.slice(0, 8) + ".." : item.name;
        ctx.fillText(itemName, x + barWidth / 2, bottomY + 20);
        
        ctx.textAlign = "left";
    });
}

function drawCategoryChart() {
    const canvas = document.getElementById("category-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const isDark = document.body.classList.contains("dark-theme");
    const rows = Array.from(tracker.getCategoryBreakdown().entries())
        .map(([category, data]) => ({ category, totalProfit: data.totalProfit }))
        .filter((row) => Math.abs(row.totalProfit) > 0)
        .sort((a, b) => Math.abs(b.totalProfit) - Math.abs(a.totalProfit));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "13px Segoe UI";
    ctx.fillStyle = isDark ? "#94a3b8" : "#64748b";

    if (!rows.length) {
        ctx.fillText("No category data for chart.", 12, 24);
        return;
    }

    const colors = ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
    const total = rows.reduce((sum, row) => sum + Math.abs(row.totalProfit), 0);
    const cx = 120;
    const cy = 130;
    const outerR = 82;
    const innerR = 48;
    let start = -Math.PI / 2;

    rows.forEach((row, idx) => {
        const value = Math.abs(row.totalProfit);
        const angle = (value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, start, start + angle);
        ctx.closePath();
        ctx.fillStyle = colors[idx % colors.length];
        ctx.fill();
        start += angle;
    });

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = isDark ? "#e2e8f0" : "#0f172a";
    ctx.font = "bold 12px Segoe UI";
    ctx.fillText("Category", cx - 24, cy - 4);
    ctx.fillText("Share", cx - 14, cy + 14);

    const legendX = 230;
    const legendTop = 36;
    const lineGap = 34;
    rows.slice(0, 6).forEach((row, idx) => {
        const y = legendTop + idx * lineGap;
        ctx.fillStyle = colors[idx % colors.length];
        ctx.fillRect(legendX, y - 10, 12, 12);
        ctx.fillStyle = isDark ? "#e2e8f0" : "#0f172a";
        ctx.font = "12px Segoe UI";
        const share = ((Math.abs(row.totalProfit) / total) * 100).toFixed(1);
        ctx.fillText(`${row.category} (${share}%)`, legendX + 18, y);
        ctx.fillText(currency(row.totalProfit), legendX + 18, y + 14);
    });
}

function drawAnalysisCharts() {
    drawProfitChart();
    drawCategoryChart();
}

function renderAll() {
    renderBestItem();
    renderRecentItems();
    renderStats();
    renderAllItemsTable();
    renderCategoryBreakdown();
    renderTopFive();
    drawAnalysisCharts();
}

const buyingPriceInput = document.getElementById("buying-price");
const marketPriceInput = document.getElementById("market-price");
const previewProfit = document.getElementById("preview-profit");
const previewProfitPercent = document.getElementById("preview-profit-percent");
const previewStatus = document.getElementById("preview-status");
const itemForm = document.getElementById("item-form");
const themeToggleButton = document.getElementById("theme-toggle");

function clearFormMessage() {
    const message = document.getElementById("form-message");
    if (!message) return;
    message.textContent = "";
    message.style.color = "";
}

function updateAddItemPreview() {
    const buyingRaw = buyingPriceInput.value;
    const marketRaw = marketPriceInput.value;
    const buyingPrice = Number(buyingRaw);
    const marketPrice = Number(marketRaw);
    const previewElement = document.getElementById("price-preview");

    if (buyingRaw === "" || marketRaw === "" || Number.isNaN(buyingPrice) || Number.isNaN(marketPrice)) {
        previewElement.style.display = "none";
        return;
    }

    previewElement.style.display = "block";
    
    const profit = marketPrice - buyingPrice;
    const profitPercent = buyingPrice === 0 ? 0 : (profit / buyingPrice) * 100;
    const worthBuying = profit > 0;

    previewProfit.textContent = currency(profit);
    previewProfit.className = worthBuying ? "money-profit" : "money-loss";
    previewProfitPercent.textContent = percent(profitPercent);
    previewProfitPercent.className = worthBuying ? "money-profit" : "money-loss";
    previewStatus.textContent = worthBuying ? "Worth Buying ✅" : "Not Worth Buying ❌";
    previewStatus.className = worthBuying ? "money-profit" : "money-loss";
}

buyingPriceInput.addEventListener("input", updateAddItemPreview);
marketPriceInput.addEventListener("input", updateAddItemPreview);
itemForm.addEventListener("reset", () => {
    requestAnimationFrame(updateAddItemPreview);
});

function updateEditItemPreview() {
    const editBuyingPrice = Number(document.getElementById("edit-buying-price").value);
    const editMarketPrice = Number(document.getElementById("edit-market-price").value);
    const editPreviewElement = document.getElementById("edit-price-preview");

    if (!editBuyingPrice || !editMarketPrice || Number.isNaN(editBuyingPrice) || Number.isNaN(editMarketPrice)) {
        editPreviewElement.style.display = "none";
        return;
    }

    editPreviewElement.style.display = "block";
    
    const profit = editMarketPrice - editBuyingPrice;
    const profitPercent = editBuyingPrice === 0 ? 0 : (profit / editBuyingPrice) * 100;
    const worthBuying = profit > 0;

    document.getElementById("edit-preview-profit").textContent = currency(profit);
    document.getElementById("edit-preview-profit").className = worthBuying ? "money-profit" : "money-loss";
    document.getElementById("edit-preview-profit-percent").textContent = percent(profitPercent);
    document.getElementById("edit-preview-profit-percent").className = worthBuying ? "money-profit" : "money-loss";
    document.getElementById("edit-preview-status").textContent = worthBuying ? "Worth Buying ✅" : "Not Worth Buying ❌";
    document.getElementById("edit-preview-status").className = worthBuying ? "money-profit" : "money-loss";
}

itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("item-name").value.trim();
    const category = document.getElementById("item-category").value;
    const buyingPrice = Number(document.getElementById("buying-price").value);
    const marketPrice = Number(document.getElementById("market-price").value);

    const message = document.getElementById("form-message");
    if (!name || !category || Number.isNaN(buyingPrice) || Number.isNaN(marketPrice) || buyingPrice < 0 || marketPrice < 0) {
        message.textContent = "Please fill all fields with valid non-negative values.";
        message.style.color = "#dc2626";
        return;
    }

    const imageUrl = await fetchUnsplashImage(name, category);
    tracker.addItem({ name, category, buyingPrice, marketPrice, imageUrl });
    persistCurrentUserItems();
    message.textContent = "Item added successfully.";
    message.style.color = "#16a34a";
    e.target.reset();
    renderAll();
    switchView("dashboard");
});

document.getElementById("clear-all").addEventListener("click", () => {
    if (!confirm("Clear all items?")) return;
    tracker.clearAll();
    persistCurrentUserItems();
    renderFilterResults([]);
    renderAll();
});

// Dual Range Slider Logic
const minSlider = document.getElementById("min-price");
const maxSlider = document.getElementById("max-price");
const rangeDisplay = document.getElementById("range-display");
const sliderRange = document.getElementById("slider-range");
const filterChipsContainer = document.getElementById("filter-chips");

function updateRangeDisplay() {
    const minVal = Number(minSlider.value);
    const maxVal = Number(maxSlider.value);
    
    // Prevent sliders from crossing
    if (minVal > maxVal - 100) {
        minSlider.value = maxVal - 100;
    }
    
    rangeDisplay.textContent = `${currency(Number(minSlider.value))} — ${currency(Number(maxSlider.value))}`;
    
    // Update visual range
    const min = (Number(minSlider.value) / Number(minSlider.max)) * 100;
    const max = (Number(maxSlider.value) / Number(maxSlider.max)) * 100;
    
    sliderRange.style.left = min + "%";
    sliderRange.style.width = (max - min) + "%";
}

minSlider.addEventListener("input", updateRangeDisplay);
maxSlider.addEventListener("input", updateRangeDisplay);

// Initialize display
updateRangeDisplay();

document.getElementById("apply-filter").addEventListener("click", () => {
    const min = Number(minSlider.value);
    const max = Number(maxSlider.value);

    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0 || min > max) {
        document.getElementById("filter-results").innerHTML = "<p class='money-loss'>Invalid range. Ensure min ≤ max and both are non-negative.</p>";
        return;
    }
    
    const results = tracker.filterByMarketRange(min, max);
    renderFilterResults(results, min, max);
    
    // Show filter chip
    filterChipsContainer.innerHTML = `
        <div class="filter-chip">
            Price: ${currency(min)} — ${currency(max)}
            <button class="filter-chip-remove" onclick="clearFilter()">×</button>
        </div>
    `;
});

function clearFilter() {
    minSlider.value = 0;
    maxSlider.value = 100000;
    updateRangeDisplay();
    filterChipsContainer.innerHTML = "";
    document.getElementById("filter-results").innerHTML = "<p class='muted'>Enter range and click Apply Filter.</p>";
}

window.clearFilter = clearFilter;

// ============ Authentication System ============
const AUTH_STORAGE_KEY = "smartResellAuth";
const USERS_STORAGE_KEY = "smartResellUsers";
const SEEDED_USERNAME = "devk";
const SEEDED_PASSWORD = "dev123";

function initAuth() {
    const currentUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!currentUser) {
        clearFormMessage();
        showAuthPage();
        return;
    }

    const users = getUsers();
    const user = users[currentUser];

    if (!user) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        clearFormMessage();
        showAuthPage();
        return;
    }

    clearFormMessage();
    loadUserItemsIntoTracker(currentUser);
    showMainApp(currentUser);
    renderStats();
    renderAll();
}

function showAuthPage() {
    tracker.clearAll();
    clearFormMessage();
    document.getElementById("auth-container").style.display = "flex";
    document.getElementById("settings-wrap").style.display = "none";
    document.getElementById("settings-menu").style.display = "none";
    const views = document.querySelectorAll(".view");
    views.forEach(view => view.classList.remove("active"));
    document.getElementById("view-dashboard").classList.add("active");
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => tab.classList.remove("active"));
    tabs[0].classList.add("active");
}

function showMainApp(username) {
    clearFormMessage();
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("settings-wrap").style.display = "flex";
    document.getElementById("settings-menu").style.display = "none";
    document.getElementById("current-user").textContent = username;
}

function getUsers() {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    if (!users) return {};

    try {
        const parsed = JSON.parse(users);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        localStorage.removeItem(USERS_STORAGE_KEY);
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function hashPassword(password) {
    return btoa(password);
}

function createStarterItems() {
    const baseTime = Date.now();
    return defaultProducts.map((product, index) => ({
        name: product.name,
        category: product.category,
        buyingPrice: Number(product.buyingPrice),
        marketPrice: Number(product.marketPrice),
        imageUrl: "",
        createdAt: baseTime - index,
    }));
}

function isSeedUser(username) {
    return username === SEEDED_USERNAME;
}

function initializeDevkAccount() {
    const users = getUsers();
    const seedPasswordHash = hashPassword(SEEDED_PASSWORD);
    
    if (!users[SEEDED_USERNAME]) {
        users[SEEDED_USERNAME] = {
            email: "devk@local",
            password: seedPasswordHash,
            items: createStarterItems(),
            isDemo: true,
            createdAt: new Date().toISOString()
        };
        saveUsers(users);
    } else {
        const devkUser = users[SEEDED_USERNAME];
        devkUser.password = seedPasswordHash;
        devkUser.isDemo = true;
        if (!Array.isArray(devkUser.items)) devkUser.items = [];
        users[SEEDED_USERNAME] = devkUser;
        saveUsers(users);
    }
}

function getUserItems(username) {
    const users = getUsers();
    const user = users[username];
    
    if (!user) return [];
    return Array.isArray(user.items) ? user.items : [];
}

function loadUserItemsIntoTracker(username) {
    const items = getUserItems(username);
    restoreTrackerItems(items);
}

function persistItemsForUser(username) {
    if (!username) return;

    const itemsSnapshot = tracker.getAllItems().map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        buyingPrice: item.buyingPrice,
        marketPrice: item.marketPrice,
        imageUrl: item.imageUrl || "",
        createdAt: item.createdAt,
    }));

    const users = getUsers();
    const user = users[username];
    if (!user) return;

    user.items = itemsSnapshot;
    users[username] = user;
    saveUsers(users);
}

function persistCurrentUserItems() {
    const currentUser = localStorage.getItem(AUTH_STORAGE_KEY);
    persistItemsForUser(currentUser);
}

function restoreTrackerItems(items) {
    const safeItems = (Array.isArray(items) ? items : []).slice().sort((a, b) => (Number(a?.createdAt) || 0) - (Number(b?.createdAt) || 0));

    tracker.itemsMap.clear();
    tracker.sortedByMarket = [];
    tracker.recentQueue.clear();
    tracker.nextId = 1;

    for (const rawItem of safeItems) {
        const name = String(rawItem?.name || "").trim();
        const category = String(rawItem?.category || "Other").trim() || "Other";
        const buyingPrice = Number(rawItem?.buyingPrice);
        const marketPrice = Number(rawItem?.marketPrice);

        if (!name || Number.isNaN(buyingPrice) || Number.isNaN(marketPrice)) continue;

        const id = Number(rawItem?.id) > 0 ? Number(rawItem.id) : tracker.nextId;
        const createdAt = Number(rawItem?.createdAt) || Date.now();
        const { profit, profitPercent } = tracker.calculateMetrics(buyingPrice, marketPrice);

        const item = {
            id,
            name,
            category,
            buyingPrice,
            marketPrice,
            profit,
            profitPercent,
            imageUrl: String(rawItem?.imageUrl || ""),
            createdAt,
        };

        tracker.itemsMap.set(id, item);
        tracker.insertSortedByMarket(item);
        tracker.recentQueue.enqueue(item);
        tracker.nextId = Math.max(tracker.nextId, id + 1);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    initializeDevkAccount();

    const settingsWrap = document.getElementById("settings-wrap");
    const settingsBtn = document.getElementById("settings-btn");
    const settingsMenu = document.getElementById("settings-menu");

    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = settingsMenu.style.display === "block";
            settingsMenu.style.display = isOpen ? "none" : "block";
        });

        settingsMenu.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        document.addEventListener("click", () => {
            settingsMenu.style.display = "none";
        });
    }

    // Login Form
    const loginForm = document.getElementById("login-form");
    const showSignupLink = document.getElementById("show-signup");
    
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("login-username").value.trim();
            const password = document.getElementById("login-password").value.trim();
            
            const users = getUsers();
            const user = users[username];
            
            if (!user) {
                alert("Username not found!");
                return;
            }
            
            const hashedPassword = hashPassword(password);
            if (user.password !== hashedPassword) {
                alert("Incorrect password!");
                return;
            }
            
            loadUserItemsIntoTracker(username);
            localStorage.setItem(AUTH_STORAGE_KEY, username);
            
            loginForm.reset();
            showMainApp(username);
            
            setTimeout(() => {
                renderStats();
                renderAll();
            }, 0);
        });
    }
    
    if (showSignupLink) {
        showSignupLink.addEventListener("click", (e) => {
            e.preventDefault();
            loginForm.style.display = "none";
            document.getElementById("signup-form").style.display = "block";
        });
    }

    // Signup Form
    const signupForm = document.getElementById("signup-form");
    const showLoginLink = document.getElementById("show-login");
    
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("signup-username").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value.trim();
            
            if (username.length < 3) {
                alert("Username must be at least 3 characters!");
                return;
            }
            
            const users = getUsers();
            if (users[username]) {
                alert("Username already exists!");
                return;
            }
            
            if (!email || email.length === 0) {
                alert("Email is required!");
                return;
            }
            
            const emailExists = Object.values(users).some(user => user && user.email && user.email.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                alert("Email already exists! Please use a different email.");
                return;
            }
            
            const hashedPassword = hashPassword(password);
            users[username] = {
                email,
                password: hashedPassword,
                items: [],
                createdAt: new Date().toISOString()
            };
            
            saveUsers(users);
            
            alert("Account created successfully! Please login.");
            signupForm.reset();
            signupForm.style.display = "none";
            loginForm.style.display = "block";
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener("click", (e) => {
            e.preventDefault();
            signupForm.style.display = "none";
            loginForm.style.display = "block";
        });
    }

    // Logout Button
    const logoutBtn = document.getElementById("logout-btn");
    function handleLogout(e) {
        e.preventDefault();
        e.stopPropagation();

        if (settingsMenu) settingsMenu.style.display = "none";
        if (settingsWrap) settingsWrap.style.display = "none";
        
        const username = localStorage.getItem(AUTH_STORAGE_KEY);

        persistItemsForUser(username);
        
        localStorage.removeItem(AUTH_STORAGE_KEY);
        tracker.clearAll();
        localStorage.removeItem("smartResellTrackerData");
        
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
        if (loginForm) loginForm.style.display = "block";
        if (signupForm) signupForm.style.display = "none";
        
        showAuthPage();
        renderStats();
        renderAll();
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Theme toggle
    if (themeToggleButton) {
        themeToggleButton.addEventListener("click", () => {
            const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
            applyTheme(nextTheme);
        });
    }

    applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");

    // Edit Modal Handlers
    const editModal = document.getElementById("edit-modal");
    const editForm = document.getElementById("edit-form");
    const editBuyingInput = document.getElementById("edit-buying-price");
    const editMarketInput = document.getElementById("edit-market-price");
    const editCancelBtn = document.getElementById("edit-modal-cancel");

    if (editBuyingInput) editBuyingInput.addEventListener("input", updateEditItemPreview);
    if (editMarketInput) editMarketInput.addEventListener("input", updateEditItemPreview);

    if (editCancelBtn) {
        editCancelBtn.addEventListener("click", (e) => {
            e.preventDefault();
            editModal.style.display = "none";
            editForm.reset();
        });
    }

    if (editForm) {
        editForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const itemId = Number(editForm.dataset.editId);
            const item = tracker.itemsMap.get(itemId);
            if (!item) return;

            const name = document.getElementById("edit-item-name").value.trim();
            const category = document.getElementById("edit-item-category").value;
            const buyingPrice = Number(document.getElementById("edit-buying-price").value);
            const marketPrice = Number(document.getElementById("edit-market-price").value);

            if (!name || !category || Number.isNaN(buyingPrice) || Number.isNaN(marketPrice) || buyingPrice < 0 || marketPrice < 0) {
                alert("Please fill all fields with valid non-negative values.");
                return;
            }

            const { profit, profitPercent } = tracker.calculateMetrics(buyingPrice, marketPrice);
            item.name = name;
            item.category = category;
            item.buyingPrice = buyingPrice;
            item.marketPrice = marketPrice;
            item.profit = profit;
            item.profitPercent = profitPercent;

            tracker.itemsMap.set(itemId, item);
            tracker.insertSortedByMarket(item);
            persistCurrentUserItems();

            editModal.style.display = "none";
            editForm.reset();
            renderAll();
        });
    }

    editModal.addEventListener("click", (e) => {
        if (e.target === editModal) {
            editModal.style.display = "none";
        }
    });

    // Initialize auth and render
    initAuth();
    updateAddItemPreview();
});
