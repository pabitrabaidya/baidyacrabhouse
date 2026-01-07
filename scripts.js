document.addEventListener('DOMContentLoaded', function() {
	const toggle = document.querySelector('.nav-toggle');
	const links = document.querySelector('.nav-links');
	if (!toggle || !links) return;

	toggle.addEventListener('click', function(e) {
		e.stopPropagation();
		links.classList.toggle('active');
		const expanded = links.classList.contains('active');
		toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
	});

	// Close menu when a nav link is clicked
	document.querySelectorAll('.nav-links a').forEach(function(a) {
		a.addEventListener('click', function() {
			links.classList.remove('active');
			toggle.setAttribute('aria-expanded', 'false');
		});
	});

	// Close menu when clicking outside
	document.addEventListener('click', function(e) {
		if (!e.target.closest('.navbar')) {
			links.classList.remove('active');
			toggle.setAttribute('aria-expanded', 'false');
		}
	});

	// Trust-bar dismissible: hide if user closed it previously (24h expiry) and allow manual restore
	(function setupTrustBar(){
		const BAR_KEY = 'tch_trust_hidden';
		const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
		const bar = document.querySelector('.trust-bar');
		if (!bar) return;

		function createTrustShowButton() {
			if (document.querySelector('.trust-show')) return;
			const btn = document.createElement('button');
			btn.className = 'trust-show';
			btn.setAttribute('aria-label', 'Show announcement');
			btn.title = 'Show announcement';
			btn.innerHTML = '⟲';
			btn.addEventListener('click', function() {
				bar.classList.remove('hidden');
				try { localStorage.removeItem(BAR_KEY); } catch (e) {}
				btn.remove();
			});
			document.body.appendChild(btn);
		}

		const stored = localStorage.getItem(BAR_KEY);
		if (stored) {
			const ts = Number(stored);
			if (Number.isNaN(ts) || (Date.now() - ts) > EXPIRY_MS) {
				// expired — show bar and remove storage
				try { localStorage.removeItem(BAR_KEY); } catch (e) {}
			} else {
				// still within expiry — hide and show small restore button
				bar.classList.add('hidden');
				createTrustShowButton();
				return;
			}
		}

		const btn = bar.querySelector('.trust-close');
		if (btn) {
			btn.addEventListener('click', function(){
				bar.classList.add('hidden');
				try { localStorage.setItem(BAR_KEY, String(Date.now())); } catch (e) {}
				createTrustShowButton();
			});
		}
	})();
	// --- Load prices.json and populate product prices ---
	async function loadPrices() {
		// show skeleton placeholders while fetching
		document.querySelectorAll('.price').forEach(el => {
			el.classList.remove('price-unavailable');
			el.classList.add('skeleton');
			el.textContent = '';
		});
		try {
			// Try multiple relative locations for prices.json so pages in subfolders (bn/) work
			const candidates = ['prices.json', '../prices.json', '../../prices.json'];
			let res = null;
			for (const path of candidates) {
				try {
					// Use no-cache to get fresh rates
					const attempt = await fetch(path, { cache: 'no-cache' });
					if (attempt && attempt.ok) {
						res = attempt;
						break;
					}
				} catch (e) {
					// ignore and try next
				}
			}
			if (!res || !res.ok) {
				console.error('Failed to fetch prices.json from candidate paths');
				showPricesUnavailable();
				return;
			}
			const data = await res.json();
			const products = data.products || [];
			const currency = data.currency || 'INR';
			const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 });
			products.forEach(p => {
				const priceEl = document.querySelector(`.product-card[data-id="${p.id}"] .price`);
				if (priceEl) {
					priceEl.classList.remove('skeleton');
					// If the product has grade-specific pricing, show a hint
				if (p.grades && typeof p.grades === 'object') {
						const lang = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : 'en';
					const priceDependsMsg = lang && lang.startsWith('bn') ? 'মূল্য গ্রেড-এর উপর নির্ভর করে' : 'Price depends on grade';
					priceEl.textContent = priceDependsMsg;
						priceEl.classList.remove('price-unavailable');
					} else if (p.price == null) {
						priceEl.textContent = 'Price unavailable';
						priceEl.classList.add('price-unavailable');
					} else {
						let priceStr = '';
						try {
							priceStr = formatter.format(p.price);
							if (p.unit) priceStr += ` ${p.unit}`;
						} catch (e) {
							priceStr = `${p.price}${p.unit ? ' ' + p.unit : ''}`;
						}
						priceEl.textContent = priceStr;
					}
				}
			});
			// After prices are loaded, set up order links (disable if grade required) and wire grade selects
			setupOrderLinks(products);
			setupGradeListeners(products, formatter);
			// Re-balance product card heights on mobile (if helper is available)
			if (typeof equalizeProductCardHeights === 'function') equalizeProductCardHeights();
			console.info('Prices loaded for', products.length, 'products');
		} catch (err) {
			console.error('Failed to load prices.json:', err);
			showPricesUnavailable();
		}
	}

	function showPricesUnavailable() {
		document.querySelectorAll('.price').forEach(el => {
			el.textContent = 'Price unavailable';
			el.classList.add('price-unavailable');
		});
	}

	loadPrices();

	// Set up WhatsApp order links per product (requires product data to know if grade is required)
	function setupOrderLinks(products) {
		document.querySelectorAll('.product-card').forEach(function(card) {
			const pid = card.dataset.id;
			const titleEl = card.querySelector('h3');
			const title = titleEl ? titleEl.textContent.trim() : (pid || 'product');
			const anchor = card.querySelector('.order-btn a.btn') || card.querySelector('.btn');
			const p = products ? products.find(x => x.id === pid) : null;
			if (!anchor) return;

			const number = '918016216344';
			const lang = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : 'en';
			const baseMessage = (lang && lang.startsWith('bn'))
				? `হ্যালো, আমি ${title} অর্ডার করতে চাই। দয়া করে আজকের দাম ও স্টক জানান।`
				: `Hello, I want to order ${title}. Please share today's price and availability.`;

			// If product defines grade-based pricing, require the user to select a grade first
			if (p && p.grades) {
			const existingHref = anchor.getAttribute('href') || '';
			const linksToProductPage = /products\.html/i.test(existingHref) || existingHref.startsWith('#') || existingHref.includes('products.html#');
			anchor.dataset.requiresGrade = 'true';
			// store base message for later
			anchor.dataset.baseMessage = baseMessage;
			// allow certain products to be ordered without selecting a grade
			const allowOrderWithoutGrade = ['mud_crab_male','mud_crab_female'].includes(pid);
			if (linksToProductPage) {
					// If we're on the index (or any page that is not products.html), make the Order button go directly to WhatsApp
					const onProductPage = /products\.html/i.test(window.location.pathname);
					if (!onProductPage) {
						anchor.setAttribute('title', 'Order via WhatsApp');
						anchor.dataset.allowOrderWithoutGrade = 'true';
						// ensure href exists (use existing href if present, otherwise use base WhatsApp message)
						if (!existingHref || !/whatsapp\.com/i.test(existingHref)) {
							anchor.setAttribute('href', `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(baseMessage)}`);
						}
						anchor.classList.remove('disabled');
						anchor.removeAttribute('aria-disabled');
						anchor.removeAttribute('tabindex');
						anchor.setAttribute('target', '_blank');
						anchor.setAttribute('rel', 'noopener noreferrer');
						// still mark that product normally requires grade on the product page
						anchor.dataset.goToProductPage = 'true';
					} else {
						// keep navigation to product page intact but mark that a grade is required on that page
						anchor.setAttribute('title', 'Select size/grade on the product page to order');
						anchor.dataset.goToProductPage = 'true';
					}
			} else if (allowOrderWithoutGrade) {
				// keep anchor enabled for allowed products (WhatsApp link) even without grade selection
				anchor.classList.remove('disabled');
				anchor.removeAttribute('aria-disabled');
				anchor.removeAttribute('tabindex');
				anchor.dataset.allowOrderWithoutGrade = 'true';
				// ensure href exists (use existing href if present, otherwise use base WhatsApp message)
				if (!existingHref || !/whatsapp\.com/i.test(existingHref)) {
					anchor.setAttribute('href', `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(baseMessage)}`);
				}
				anchor.setAttribute('target', '_blank');
				anchor.setAttribute('rel', 'noopener noreferrer');
			} else {
				// disable anchor until a valid grade is selected
				anchor.classList.add('disabled');
				anchor.setAttribute('aria-disabled', 'true');
				anchor.removeAttribute('href');
				anchor.setAttribute('tabindex', '-1');
			}
			} else {
				anchor.classList.remove('disabled');
				anchor.removeAttribute('aria-disabled');
				anchor.removeAttribute('tabindex');
				anchor.dataset.requiresGrade = 'false';
				anchor.setAttribute('href', `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(baseMessage)}`);
				anchor.setAttribute('target', '_blank');
				anchor.setAttribute('rel', 'noopener noreferrer');
			}
		});
	}
	setupImageSwitchers();

	// Image switcher — thumbnails swap main image and update weight display
	function setupImageSwitchers() {
		document.querySelectorAll('.image-switcher').forEach(function(switcher) {
			const thumbs = Array.from(switcher.querySelectorAll('.thumb'));
			const parent = switcher.closest('.product-card') || document;
			const main = parent.querySelector('.main-img') || parent.querySelector('img');
			const weightEl = parent.querySelector('.weight');
			thumbs.forEach(function(btn) {
				btn.addEventListener('click', function() {
					const src = btn.getAttribute('data-src');
					const weight = btn.getAttribute('data-weight') || '';
					if (main && src) main.setAttribute('src', src);
					if (weightEl && weight) {
						// keep label language already present in HTML
						if (weightEl.textContent.trim().startsWith('ওজন')) weightEl.textContent = 'ওজন: ' + weight;
						else weightEl.textContent = 'Weight: ' + weight;
					}
					thumbs.forEach(t => t.classList.remove('selected'));
					btn.classList.add('selected');
				});
			});
		});
	}

	// Update price and order link when a grade/size is selected
	function setupGradeListeners(products, formatter) {
		const number = '918016216344';
		document.querySelectorAll('.product-card').forEach(function(card) {
			const select = card.querySelector('.grade-select');
			const anchor = card.querySelector('.order-btn a.btn') || card.querySelector('.btn');
			const priceEl = card.querySelector('.price');
			const pid = card.dataset.id;
			if (!select) return;

			const update = function() {
				const grade = select.value;
				// find product info
				const p = products.find(x => x.id === pid);
// localized message when price depends on grade
			const lang = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : 'en';
			const priceDependsMsg = lang && lang.startsWith('bn') ? 'মূল্য গ্রেড-এর উপর নির্ভর করে' : 'Price depends on grade';
			// update price based on grade-specific pricing if available
			if (p && p.grades && typeof p.grades === 'object') {
				if (grade && p.grades[grade] != null) {
					let val = p.grades[grade];
					try {
						priceEl.textContent = formatter.format(val) + (p.unit ? ' ' + p.unit : '');
						priceEl.classList.remove('price-unavailable');
					} catch (e) {
						priceEl.textContent = val + (p.unit ? ' ' + p.unit : '');
					}
				} else {
					// no specific grade selected — instruct user that price depends on grade
					priceEl.textContent = priceDependsMsg;
				}
			} else if (p && p.price) {
				// fallback to product base price
				priceEl.textContent = formatter.format(p.price) + (p.unit ? ' ' + p.unit : '');
			} else {
				priceEl.textContent = priceDependsMsg;
				}

				// update order link message to include size/grade if present
				if (anchor) {
					const titleEl = card.querySelector('h3');
					const title = titleEl ? titleEl.textContent.trim() : (card.dataset.id || 'product');
					let message;
					if (lang && lang.startsWith('bn')) {
						message = `হ্যালো, আমি ${title} অর্ডার করতে চাই`;
						if (grade) message += ` — সাইজ: ${grade}`;
						message += `। দয়া করে আজকের দাম ও স্টক জানান।`;
					} else {
						message = `Hello, I would like to order ${title}`;
						if (grade) message += ` — Size: ${grade}`;
						message += `. Please share today's price and availability.`;
					}

					// If this anchor requires a grade, only enable it when a valid grade (or fallback) exists
					const requiresGrade = anchor.dataset && anchor.dataset.requiresGrade === 'true';
						const allowOrderWithoutGrade = anchor.dataset && anchor.dataset.allowOrderWithoutGrade === 'true';
						if (requiresGrade) {
							let enable = false;
							if (p && p.grades && typeof p.grades === 'object' && p.grades[grade] != null) enable = true;
							if (!enable && p && p.price != null) enable = true;
							// special-case: allow ordering without grade for certain products (e.g., male/female mud crab)
							if (!enable && allowOrderWithoutGrade) enable = true;

							if (enable) {
								anchor.classList.remove('disabled');
								anchor.removeAttribute('aria-disabled');
								anchor.removeAttribute('tabindex');
								anchor.setAttribute('href', `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`);
								anchor.setAttribute('target', '_blank');
								anchor.setAttribute('rel', 'noopener noreferrer');


						} else {
							anchor.classList.add('disabled');
							anchor.setAttribute('aria-disabled', 'true');
							anchor.removeAttribute('href');
							anchor.setAttribute('tabindex', '-1');
						}
					} else {
						anchor.setAttribute('href', `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`);
						anchor.setAttribute('target', '_blank');
						anchor.setAttribute('rel', 'noopener noreferrer');
					}
				}
			};

			select.addEventListener('change', update);
			// initialize based on current selection (in case a value is pre-selected)
			update();
		});
	}

	// Equalize product card heights: simplified/disabled.
	// Rely on CSS (flex + grid stretch + .product-meta) for consistent heights.
	function equalizeProductCardHeights() {
		const cards = Array.from(document.querySelectorAll('.product-card'));
		if (!cards.length) return;
		// Make sure we don't impose JS min-heights — just clear any previous inline minHeight.
		cards.forEach(c => { c.style.minHeight = ''; });
		// No further action: CSS should handle consistent heights.
	}

	// Observe card content changes (images, thumbnails, font loads) and re-run equalization
	const debouncedEqualize = debounce(equalizeProductCardHeights, 120);
	if (window.ResizeObserver) {
		const ro = new ResizeObserver(debouncedEqualize);
		Array.from(document.querySelectorAll('.product-card')).forEach(c => ro.observe(c));
		// store observer for potential cleanup/debugging
		window._productCardResizeObserver = ro;
	}
	// Re-run when images load (useful for lazy-loaded images)
	Array.from(document.querySelectorAll('.product-card img')).forEach(img => {
		if (img.complete) return;
		img.addEventListener('load', debouncedEqualize);
	});
	// Also listen to thumbnail image switches (clicks) which can change layout
	Array.from(document.querySelectorAll('.thumb')).forEach(btn => btn.addEventListener('click', debounce(equalizeProductCardHeights, 80)));


	function debounce(fn, wait = 150) {
		let t;
		return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
	}

	// Run on initial load and on resize (debounced)
	window.addEventListener('load', equalizeProductCardHeights);
	window.addEventListener('resize', debounce(equalizeProductCardHeights, 120));
	// Expose for other flows (prices loaded etc.)
	window.equalizeProductCardHeights = equalizeProductCardHeights;

	// One-time run
	equalizeProductCardHeights();

});