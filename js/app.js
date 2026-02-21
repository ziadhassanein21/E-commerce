import { products } from './products.js';

const Auth = {
    isLoggedIn() {
        return localStorage.getItem('perfume_user') !== null;
    },
    getUser() {
        let data = localStorage.getItem('perfume_user');
        return data ? JSON.parse(data) : null;
    },
    register(name, email, password) {
        let users = JSON.parse(localStorage.getItem('perfume_users') || '[]');
        if (users.find(u => u.email === email))
            return { success: false, message: 'An account with this email already exists.' };
        users.push({ name, email, password });
        localStorage.setItem('perfume_users', JSON.stringify(users));
        localStorage.setItem('perfume_user', JSON.stringify({ name, email }));
        return { success: true, message: 'Registration successful!' };
    },
    login(email, password) {
        let users = JSON.parse(localStorage.getItem('perfume_users') || '[]');
        let user = users.find(u => u.email === email && u.password === password);
        if (!user) return { success: false, message: 'Invalid email or password.' };
        localStorage.setItem('perfume_user', JSON.stringify({ name: user.name, email: user.email }));
        return { success: true, message: 'Login successful!' };
    },
    logout() {
        localStorage.removeItem('perfume_user');
        window.location.href = 'login.html';
    },
    protect() {
        if (!this.isLoggedIn()) window.location.href = 'login.html';
    }
};

const Cart = {
    STORAGE_KEY: 'perfume_cart',

    getItems() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    },
    save(items) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
        this.updateBadge();
    },
    addItem(productId, volume, qty = 1) {
        let items = this.getItems();
        let existing = items.find(i => i.productId === productId && i.volume === volume);
        if (existing) {
            existing.qty += qty;
        } else {
            items.push({ productId, volume, qty });
        }
        this.save(items);
        UI.showToast('Added to cart!');
    },
    removeItem(index) {
        let items = this.getItems();
        items.splice(index, 1);
        this.save(items);
    },
    updateQty(index, newQty) {
        let items = this.getItems();
        if (newQty < 1) items.splice(index, 1);
        else items[index].qty = newQty;
        this.save(items);
    },
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.updateBadge();
    },
    getCount() {
        return this.getItems().reduce((sum, item) => sum + item.qty, 0);
    },
    getSubtotal() {
        return this.getItems().reduce((sum, item) => {
            let product = products.find(p => p.id === item.productId);
            return sum + (product ? product.price * item.qty : 0);
        }, 0);
    },
    getShipping() {
        return this.getSubtotal() >= 75 ? 0 : 10;
    },
    getTotal() {
        return this.getSubtotal() + this.getShipping();
    },
    updateBadge() {
        let badge = document.getElementById('cart-badge');
        if (!badge) return;
        let count = this.getCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');
    }
};

const Wishlist = {
    STORAGE_KEY: 'perfume_wishlist',

    getItems() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    },
    contains(productId) {
        return this.getItems().includes(productId);
    },
    toggle(productId) {
        let items = this.getItems();
        let inList = items.includes(productId);
        if (inList) {
            items = items.filter(id => id !== productId);
            UI.showToast('Removed from wishlist');
        } else {
            items.push(productId);
            UI.showToast('Added to wishlist ❤️');
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
        document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(btn => {
            btn.classList.toggle('active', !inList);
            btn.innerHTML = !inList ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
        });
        this.updateBadge();
    },
    getCount() {
        return this.getItems().length;
    },
    updateBadge() {
        let badge = document.getElementById('wishlist-badge');
        if (!badge) return;
        let count = this.getCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
};

const Orders = {
    STORAGE_KEY: 'perfume_orders',

    getAll() {
        let user = Auth.getUser();
        if (!user) return [];
        let all = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        return all[user.email] || [];
    },
    save(orderData) {
        let user = Auth.getUser();
        if (!user) return;
        let all = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        if (!all[user.email]) all[user.email] = [];
        orderData.date = new Date().toISOString();
        orderData.status = 'Processing';
        all[user.email].unshift(orderData);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    }
};

const UI = {
    showToast(message) {
        let old = document.querySelector('.toast-notification');
        if (old) old.remove();
        let toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>${message}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    initScrollReveal() {
        let els = document.querySelectorAll('.reveal');
        if (!els.length) return;
        let obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        els.forEach(el => obs.observe(el));
    },

    initAnnouncementBar() {
        let messages = [
            "Free shipping on orders over $75 — Limited time offer",
            "New Arrivals: The Oud Collection is here",
            "Join L'Essence Privé for exclusive rewards",
            "Complimentary samples with every purchase"
        ];
        let bar = document.getElementById('announcement-bar');
        let closeBtn = document.getElementById('close-announcement');
        if (!bar) return;
        document.body.classList.add('has-banner');
        let track = document.createElement('div');
        track.className = 'announcement-track';
        messages.forEach(msg => {
            let span = document.createElement('span');
            span.textContent = msg;
            track.appendChild(span);
        });
        bar.insertBefore(track, closeBtn);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.body.classList.remove('has-banner');
                bar.classList.add('hidden');
                setTimeout(() => bar.remove(), 400);
            });
        }
    },

    buildNavbar() {
        let user = Auth.getUser();
        let cartCount = Cart.getCount();
        let wishCount = Wishlist.getCount();
        let page = window.location.pathname.split('/').pop() || 'index.html';
        let nav = document.getElementById('main-navbar');
        if (!nav) return;

        nav.innerHTML = `
        <div class="container">
            <a class="navbar-brand" href="index.html">L'Essence</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto align-items-center">
                    <li class="nav-item">
                        <a class="nav-link ${page === 'index.html' ? 'active' : ''}" href="index.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="index.html#collection">Shop</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link nav-icon-btn" href="#" id="btn-search" title="Search">
                            <i class="bi bi-search"></i>
                        </a>
                    </li>
                    <li class="nav-item position-relative">
                        <a class="nav-link nav-icon-btn" href="wishlist.html" title="Wishlist">
                            <i class="bi bi-heart"></i>
                            <span class="cart-badge" id="wishlist-badge" style="display:${wishCount > 0 ? 'flex' : 'none'}">${wishCount}</span>
                        </a>
                    </li>
                    <li class="nav-item position-relative">
                        <a class="nav-link nav-icon-btn" href="cart.html" title="Cart">
                            <i class="bi bi-bag"></i>
                            <span class="cart-badge" id="cart-badge" style="display:${cartCount > 0 ? 'flex' : 'none'}">${cartCount}</span>
                        </a>
                    </li>
                    ${user ? `
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle"></i> ${user.name.split(' ')[0]}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" style="background:var(--color-black);border:1px solid rgba(201,168,76,0.2)">
                            <li><a class="dropdown-item text-light" href="profile.html"><i class="bi bi-person me-2"></i>My Profile</a></li>
                            <li><a class="dropdown-item text-light" href="wishlist.html"><i class="bi bi-heart me-2"></i>Wishlist</a></li>
                            <li><hr class="dropdown-divider" style="border-color:rgba(201,168,76,0.2)"></li>
                            <li><a class="dropdown-item text-light" href="#" id="btn-logout"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                        </ul>
                    </li>` : `
                    <li class="nav-item">
                        <a class="nav-link" href="login.html"><i class="bi bi-person"></i> Login</a>
                    </li>`}
                </ul>
            </div>
        </div>`;

        let logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', e => {
                e.preventDefault();
                Auth.logout();
            });
        }

        let overlay = document.getElementById('search-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'search-overlay';
            overlay.id = 'search-overlay';
            overlay.innerHTML = `
                <div class="search-overlay-content">
                    <input type="text" class="search-input" id="search-input" placeholder="Search fragrances..." autocomplete="off">
                    <button class="search-close" id="search-close"><i class="bi bi-x-lg"></i></button>
                </div>
                <div class="search-results" id="search-results"></div>`;
            document.body.appendChild(overlay);
        }
        this.initSearch();
    },

    initSearch() {
        let searchBtn = document.getElementById('btn-search');
        let overlay = document.getElementById('search-overlay');
        let input = document.getElementById('search-input');
        let closeBtn = document.getElementById('search-close');
        let results = document.getElementById('search-results');
        if (!searchBtn || !overlay) return;

        searchBtn.addEventListener('click', e => {
            e.preventDefault();
            overlay.classList.add('active');
            setTimeout(() => input.focus(), 300);
        });

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            input.value = '';
            results.innerHTML = '';
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                input.value = '';
                results.innerHTML = '';
            }
        });

        input.addEventListener('input', () => {
            let q = input.value.trim().toLowerCase();
            if (q.length < 2) { results.innerHTML = ''; return; }

            let matches = products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q)
            ).slice(0, 6);

            if (!matches.length) {
                results.innerHTML = '<div class="search-no-results">No fragrances found</div>';
                return;
            }
            results.innerHTML = matches.map(p => `
                <a href="product.html?id=${p.id}" class="search-result-item">
                    <img src="${p.images[0]}" alt="${p.name}">
                    <div class="search-result-info">
                        <h6>${p.name}</h6>
                        <span>${p.brand} — ${p.category}</span>
                        <strong>${this.formatPrice(p.price)}</strong>
                    </div>
                </a>
            `).join('');
        });
    },

    buildFooter() {
        let footer = document.getElementById('main-footer');
        if (!footer) return;
        footer.innerHTML = `
        <div class="container">
            <div class="row g-4">
                <div class="col-lg-4 col-md-6">
                    <div class="footer-brand">L'Essence</div>
                    <p class="footer-tagline">The art of fragrance, refined.</p>
                    <div class="social-icons">
                        <a href="#"><i class="bi bi-facebook"></i></a>
                        <a href="#"><i class="bi bi-instagram"></i></a>
                        <a href="#"><i class="bi bi-twitter-x"></i></a>
                        <a href="#"><i class="bi bi-pinterest"></i></a>
                    </div>
                </div>
                <div class="col-lg-2 col-md-6">
                    <h6>Navigate</h6>
                    <ul>
                        <li><a href="index.html">Home</a></li>
                        <li><a href="index.html#collection">Shop</a></li>
                        <li><a href="#">About</a></li>
                        <li><a href="#">Contact</a></li>
                    </ul>
                </div>
                <div class="col-lg-2 col-md-6">
                    <h6>Support</h6>
                    <ul>
                        <li><a href="#">Shipping</a></li>
                        <li><a href="#">Returns</a></li>
                        <li><a href="#">FAQ</a></li>
                        <li><a href="#">Privacy</a></li>
                    </ul>
                </div>
                <div class="col-lg-4 col-md-6">
                    <h6>Newsletter</h6>
                    <p style="font-size:0.85rem;margin-bottom:12px;">Subscribe for exclusive offers and new arrivals.</p>
                    <div class="newsletter-input">
                        <input type="email" placeholder="Your email address">
                        <button type="button">Subscribe</button>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                &copy; ${new Date().getFullYear()} L'Essence. All rights reserved.
            </div>
        </div>`;
    },

    starsHTML(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) html += '<i class="bi bi-star-fill"></i>';
            else if (i - rating < 1) html += '<i class="bi bi-star-half"></i>';
            else html += '<i class="bi bi-star"></i>';
        }
        return html;
    },

    formatPrice(num) {
        return '$' + num.toFixed(2);
    }
};

const Products = {
    getAll() { return products; },
    getById(id) { return products.find(p => p.id === parseInt(id)); },
    getByCategory(cat) {
        return cat === 'All' ? products : products.filter(p => p.category === cat);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.buildNavbar();
    UI.buildFooter();
    UI.initAnnouncementBar();
    UI.initScrollReveal();
    Cart.updateBadge();
    Wishlist.updateBadge();
});

export { Auth, Cart, UI, Products, Wishlist, Orders };
