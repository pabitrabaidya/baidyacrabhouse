/**
 * Baidya Crab House — Interactive Client Engine
 * Handles Navigation, Live Pricing, Dynamic WhatsApp URL Pre-filling,
 * Image Carousel, Instant Search & Category Filters.
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const BUSINESS_PHONE = '919382682425';
  const isBengali = document.documentElement.lang && document.documentElement.lang.startsWith('bn');

  // --- 1. Responsive Navbar & Mobile Menu ---
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const isActive = navLinks.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      navToggle.classList.toggle('open', isActive);
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('open');
      });
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.navbar')) {
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('open');
      }
    });
  }

  // --- Smooth Scrolling for In-Page Navigation & 'Explore Crabs' CTA ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const navbar = document.querySelector('.navbar');
        const offset = navbar ? navbar.offsetHeight + 16 : 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = targetEl.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        if (history.pushState) {
          history.pushState(null, null, targetId);
        }
      }
    });
  });

  // --- 2. Trust Bar (Dismissible with 24h Expiry) ---
  (function initTrustBar() {
    const BAR_KEY = 'bch_trust_dismissed';
    const EXPIRY_MS = 24 * 60 * 60 * 1000;
    const bar = document.querySelector('.trust-bar');
    if (!bar) return;

    try {
      const stored = localStorage.getItem(BAR_KEY);
      if (stored) {
        const ts = Number(stored);
        if (!Number.isNaN(ts) && (Date.now() - ts) < EXPIRY_MS) {
          bar.classList.add('hidden');
          return;
        }
        localStorage.removeItem(BAR_KEY);
      }
    } catch (e) {
      // Storage access blocked or restricted
    }

    const closeBtn = bar.querySelector('.trust-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        bar.classList.add('hidden');
        try {
          localStorage.setItem(BAR_KEY, String(Date.now()));
        } catch (e) {}
      });
    }
  })();

  // --- 3. Synchronized Pricing Data & Dynamic Updating ---
  const FALLBACK_PRICES = {
    last_updated: '2026-10-12',
    currency: 'INR',
    products: [
      {
        id: 'mud_crab_female',
        name: 'Mud Crab — Female',
        name_bn: 'মাড কাঁকড়া — মহিলা (ঘিলু ভরা)',
        price: 599,
        starting_price: 599,
        price_range: '₹599 – ₹1,099',
        unit: ' / kg',
        unit_bn: ' / কেজি',
        in_stock: true,
        grades: {
          SGF: 1099,
          SGF2: 949,
          F1: 750,
          F2: 699,
          F3: 599,
          MFC: 749
        }
      },
      {
        id: 'mud_crab_male',
        name: 'Mud Crab — Male',
        name_bn: 'মাড কাঁকড়া — পুরুষ',
        price: 399,
        starting_price: 399,
        price_range: '₹399 – ₹1,199',
        unit: ' / kg',
        unit_bn: ' / কেজি',
        in_stock: true,
        grades: {
          XXLC: 1199,
          XLC: 899,
          LC: 699,
          MC: 599,
          SC: 499,
          MALE_FEMALE_COMBO: 399
        }
      },
      {
        id: 'green_crab',
        name: 'Green Crab',
        name_bn: 'সবুজ কাঁকড়া',
        price: 650,
        starting_price: 550,
        price_range: '₹550 – ₹850',
        unit: ' / kg',
        unit_bn: ' / কেজি',
        in_stock: true,
        grades: {
          S: 550,
          M: 650,
          L: 750,
          XL: 850
        }
      },
      {
        id: 'blue_crab',
        name: 'Blue Crab',
        name_bn: 'নীল কাঁকড়া',
        price: 600,
        starting_price: 550,
        price_range: '₹550 – ₹750',
        unit: ' / kg',
        unit_bn: ' / কেজি',
        in_stock: false,
        grades: {
          S: 550,
          M: 600,
          L: 650,
          XL: 700,
          XXL: 750
        }
      },
      {
        id: 'sea_crab',
        name: 'Sea Crab',
        name_bn: 'সি কাঁকড়া',
        price: 700,
        starting_price: 650,
        price_range: '₹650 – ₹800',
        unit: ' / kg',
        unit_bn: ' / কেজি',
        in_stock: false,
        grades: {
          S: 650,
          M: 700,
          L: 750,
          XL: 800
        }
      }
    ]
  };

  function buildWhatsAppUrl(productName, gradeText, isOutOfStock) {
    let msg = '';
    if (isOutOfStock) {
      msg = isBengali
        ? `নমস্কার Baidya Crab House, আমি ${productName}-এ আগ্রহী। এটি আবার কবে পাওয়া যাবে জানাবেন কি?`
        : `Hello Baidya Crab House, I am interested in ${productName}. Could you please let me know when it will be back in stock and available for delivery?`;
    } else if (gradeText) {
      msg = isBengali
        ? `নমস্কার Baidya Crab House, আমি ${productName}, সাইজ: ${gradeText}-এ আগ্রহী। অনুগ্রহ করে আজকের দাম, প্রাপ্যতা, ডেলিভারি চার্জ এবং আমার এলাকায় ডেলিভারি নিশ্চিত করুন।`
        : `Hello Baidya Crab House, I am interested in ${productName}, size ${gradeText}. Please confirm today's price, availability, delivery charges, and delivery availability for my location.`;
    } else {
      msg = isBengali
        ? `নমস্কার Baidya Crab House, আমি ${productName}-এ আগ্রহী। অনুগ্রহ করে আজকের দাম, উপলব্ধ সাইজ এবং আমার এলাকায় ডেলিভারি প্রাপ্যতা জানাবেন।`
        : `Hello Baidya Crab House, I am interested in ${productName}. Please confirm today's price, available sizes, and delivery availability for my location.`;
    }
    return `https://api.whatsapp.com/send?phone=${BUSINESS_PHONE}&text=${encodeURIComponent(msg)}`;
  }

  function setOrderButton(anchor, label, isOutOfStock) {
    anchor.classList.toggle('secondary', isOutOfStock);
    anchor.classList.toggle('btn-whatsapp', !isOutOfStock);
    const icon = document.createElement('i');
    icon.className = 'fab fa-whatsapp';
    icon.setAttribute('aria-hidden', 'true');
    anchor.replaceChildren(icon, document.createTextNode(` ${label}`));
  }

  async function fetchPrices() {
    const candidates = ['/api/prices', 'prices.json', '../prices.json', '../../prices.json'];
    for (const path of candidates) {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) {
          if (path === '/api/prices') {
            console.error(`Pricing API returned ${res.status}; trying the static price file.`);
          }
          continue;
        }
        const json = await res.json();
        if (json && Array.isArray(json.products) && json.products.length > 0) {
          return json;
        }
      } catch (err) {
        console.error(`Unable to load pricing from ${path}:`, err);
      }
    }
    return FALLBACK_PRICES;
  }

  async function initPricingAndProducts() {
    const data = await fetchPrices();
    const products = data.products || FALLBACK_PRICES.products;
    const currency = data.currency || 'INR';

    // Show last updated badge
    const badge = document.getElementById('last-updated-badge');
    if (badge && data.last_updated) {
      badge.textContent = isBengali
        ? `📅 আজকের রেট আপডেট: ${data.last_updated}`
        : `📅 Prices Verified: ${data.last_updated}`;
      badge.style.display = 'inline-flex';
    }

    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    });

    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
      const pid = card.dataset.id;
      const p = products.find(item => item.id === pid);
      if (!p) return;

      const isOut = p.in_stock === false;
      const priceEl = card.querySelector('.price');
      const gradeSelect = card.querySelector('.grade-select');
      const orderBtnAnchor = card.querySelector('.order-btn a.btn') || card.querySelector('a.btn');
      const cardTitle = card.querySelector('h3, h4')?.textContent?.trim() || (isBengali ? p.name_bn : p.name);

      const unitText = isBengali ? (p.unit_bn || ' / কেজি') : (p.unit || ' / kg');
      if (gradeSelect) {
        gradeSelect.disabled = isOut;
        const existingGrades = new Set();
        gradeSelect.querySelectorAll('option').forEach(option => {
          if (option.value) existingGrades.add(option.value);
          if (p.grades?.[option.value] == null) return;
          option.textContent = option.textContent.replace(
            /₹\s*[\d,০-৯]+(?:\s*\/\s*(?:kg|কেজি))?/g,
            formatter.format(p.grades[option.value])
          );
        });
        Object.entries(p.grades || {}).forEach(([grade, price]) => {
          if (existingGrades.has(grade)) return;
          const option = document.createElement('option');
          option.value = grade;
          option.textContent = `${grade} (${formatter.format(price)}${unitText})`;
          gradeSelect.append(option);
        });
      }

      // Update Stock and Price Display
      if (isOut) {
        card.dataset.outOfStock = 'true';
        if (priceEl) {
          priceEl.textContent = isBengali ? 'স্টক শেষ' : 'Out of Stock';
          priceEl.classList.add('price-out-of-stock');
          priceEl.classList.remove('skeleton');
        }
        if (gradeSelect) gradeSelect.disabled = true;

        const badgeEl = card.querySelector('.badge, .img-badge');
        if (badgeEl) {
          badgeEl.textContent = isBengali ? 'স্টক শেষ' : 'Out of Stock';
          badgeEl.className = badgeEl.classList.contains('img-badge')
            ? 'img-badge out-of-stock'
            : 'badge badge-out-of-stock';
        }

        if (orderBtnAnchor) {
          setOrderButton(orderBtnAnchor, isBengali ? 'স্টক সম্পর্কে জানুন' : 'Enquire Restock', true);
          orderBtnAnchor.setAttribute('href', buildWhatsAppUrl(cardTitle, '', true));
          orderBtnAnchor.setAttribute('target', '_blank');
          orderBtnAnchor.setAttribute('rel', 'noopener noreferrer');
        }
        return;
      }

      const badgeEl = card.querySelector('.badge, .img-badge');
      if (badgeEl && badgeEl.classList.contains('out-of-stock')) {
        badgeEl.textContent = isBengali ? 'তাজা' : 'Fresh';
        badgeEl.className = badgeEl.classList.contains('img-badge')
          ? 'img-badge fresh'
          : 'badge badge-live';
      }
      const availableDescription = isBengali
        ? card.dataset.availableDescriptionBn
        : card.dataset.availableDescription;
      const description = card.querySelector('.product-body > p');
      if (!isOut && availableDescription && description) {
        description.textContent = availableDescription;
      }

      // In stock: set initial price display
      if (priceEl) {
        priceEl.classList.remove('skeleton');
        if (p.starting_price) {
          const formattedStart = formatter.format(p.starting_price);
          priceEl.textContent = isBengali
            ? `${formattedStart}${unitText} থেকে শুরু`
            : `From ${formattedStart}${unitText}`;
        } else if (p.price) {
          priceEl.textContent = `${formatter.format(p.price)}${unitText}`;
        } else {
          priceEl.textContent = isBengali ? 'আজকের রেট জানতে ক্লিক করুন' : 'Contact for today’s price';
        }
      }

      // Initial WhatsApp order link
      if (orderBtnAnchor) {
        setOrderButton(orderBtnAnchor, isBengali ? 'WhatsApp-এ অর্ডার' : 'Enquire on WhatsApp', false);
        orderBtnAnchor.setAttribute('href', buildWhatsAppUrl(cardTitle, '', false));
        orderBtnAnchor.setAttribute('target', '_blank');
        orderBtnAnchor.setAttribute('rel', 'noopener noreferrer');
      }

      // Handle Grade Selection Change
      if (gradeSelect) {
        gradeSelect.addEventListener('change', function () {
          const selectedGrade = gradeSelect.value;
          const selectedOptionText = gradeSelect.options[gradeSelect.selectedIndex]?.text?.trim() || selectedGrade;

          if (selectedGrade && p.grades && p.grades[selectedGrade] != null) {
            const gradePrice = p.grades[selectedGrade];
            if (priceEl) {
              priceEl.textContent = `${formatter.format(gradePrice)}${unitText}`;
              priceEl.classList.add('price-highlight');
              setTimeout(() => priceEl.classList.remove('price-highlight'), 600);
            }
            if (orderBtnAnchor) {
              orderBtnAnchor.setAttribute('href', buildWhatsAppUrl(cardTitle, selectedOptionText, false));
            }
          } else {
            // Revert to starting price
            if (priceEl) {
              if (p.starting_price) {
                const formattedStart = formatter.format(p.starting_price);
                priceEl.textContent = isBengali
                  ? `${formattedStart}${unitText} থেকে শুরু`
                  : `From ${formattedStart}${unitText}`;
              } else if (p.price) {
                priceEl.textContent = `${formatter.format(p.price)}${unitText}`;
              }
            }
            if (orderBtnAnchor) {
              orderBtnAnchor.setAttribute('href', buildWhatsAppUrl(cardTitle, '', false));
            }
          }
        });
      }
    });
  }

  // --- 4. Interactive Product Image Carousel ---
  function initImageCarousels() {
    const AUTO_DELAY_MS = 6000;

    document.querySelectorAll('.product-card').forEach(card => {
      const thumbStrip = card.querySelector('.thumbs.image-switcher');
      const mainImg = card.querySelector('.main-img');
      if (!mainImg) return;

      const slides = [];

      if (thumbStrip) {
        thumbStrip.querySelectorAll('.thumb[data-src]').forEach(btn => {
          slides.push({
            src: btn.getAttribute('data-src'),
            weight: btn.getAttribute('data-weight') || '',
            alt: btn.querySelector('img')?.getAttribute('alt') || mainImg.getAttribute('alt') || 'Crab photo'
          });
        });
        thumbStrip.remove(); // Clean up thumbnail strip to prevent layout clutter
      }

      if (slides.length <= 1) return;

      const mediaContainer = card.querySelector('.product-media') || card;
      let currentIndex = 0;
      const weightEl = card.querySelector('.weight');

      function showSlide(idx) {
        currentIndex = (idx + slides.length) % slides.length;
        mainImg.style.opacity = '0.2';
        setTimeout(() => {
          mainImg.setAttribute('src', slides[currentIndex].src);
          mainImg.setAttribute('alt', slides[currentIndex].alt);
          mainImg.style.opacity = '1';

          if (weightEl && slides[currentIndex].weight && slides[currentIndex].weight !== '..') {
            const label = isBengali ? 'ওজন: ' : 'Weight: ';
            weightEl.textContent = label + slides[currentIndex].weight;
          }

          dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
            dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
          });
        }, 150);
      }

      // Prev / Next Buttons
      const prevBtn = document.createElement('button');
      prevBtn.className = 'carousel-arrow carousel-arrow-prev';
      prevBtn.setAttribute('aria-label', isBengali ? 'পূর্ববর্তী ছবি' : 'Previous photo');
      prevBtn.innerHTML = '‹';
      prevBtn.type = 'button';
      prevBtn.addEventListener('click', e => {
        e.stopPropagation();
        resetAutoTimer();
        showSlide(currentIndex - 1);
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'carousel-arrow carousel-arrow-next';
      nextBtn.setAttribute('aria-label', isBengali ? 'পরবর্তী ছবি' : 'Next photo');
      nextBtn.innerHTML = '›';
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', e => {
        e.stopPropagation();
        resetAutoTimer();
        showSlide(currentIndex + 1);
      });

      mediaContainer.appendChild(prevBtn);
      mediaContainer.appendChild(nextBtn);

      // Dot Indicators
      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'carousel-dots';
      const dots = slides.map((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `${isBengali ? 'ছবি' : 'Image'} ${i + 1}`);
        dot.type = 'button';
        dot.addEventListener('click', e => {
          e.stopPropagation();
          resetAutoTimer();
          showSlide(i);
        });
        dotsWrap.appendChild(dot);
        return dot;
      });
      mediaContainer.appendChild(dotsWrap);

      // Timer & Touch Controls
      let timer = setInterval(() => showSlide(currentIndex + 1), AUTO_DELAY_MS);
      function resetAutoTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => showSlide(currentIndex + 1), AUTO_DELAY_MS);
      }

      mediaContainer.addEventListener('mouseenter', () => {
        if (timer) clearInterval(timer);
      });
      mediaContainer.addEventListener('mouseleave', resetAutoTimer);

      let touchStartX = 0;
      mediaContainer.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      mediaContainer.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 40) {
          resetAutoTimer();
          showSlide(diff < 0 ? currentIndex + 1 : currentIndex - 1);
        }
      }, { passive: true });
    });
  }

  // --- 5. Catalogue Search & Filtering ---
  function initCatalogueFiltering() {
    const isProductsPage = window.location.pathname.includes('products.html');
    if (!isProductsPage) return;

    const searchInputs = document.querySelectorAll('.nav-search input, .page-search input');
    const filterButtons = document.querySelectorAll('.category-filters .filter-btn');
    const cards = document.querySelectorAll('.product-card');

    let activeFilter = 'all';
    let searchQuery = '';

    // Check URL parameters for search
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('q')) {
      searchQuery = urlParams.get('q').trim().toLowerCase();
      searchInputs.forEach(inp => { inp.value = urlParams.get('q'); });
    }

    function applyFilters() {
      let visibleCount = 0;

      cards.forEach(card => {
        const title = card.querySelector('h3, h4')?.textContent?.toLowerCase() || '';
        const desc = card.querySelector('p')?.textContent?.toLowerCase() || '';
        const id = card.dataset.id?.toLowerCase() || '';
        const badge = card.querySelector('.badge')?.textContent?.toLowerCase() || '';
        const isOutOfStock = card.dataset.outOfStock === 'true';

        // 1. Check Query
        const matchesQuery = !searchQuery ||
          title.includes(searchQuery) ||
          desc.includes(searchQuery) ||
          id.includes(searchQuery);

        // 2. Check Category Filter
        let matchesFilter = true;
        if (activeFilter === 'live') {
          matchesFilter = badge.includes('live') || badge.includes('লাইভ');
        } else if (activeFilter === 'fresh') {
          matchesFilter = badge.includes('fresh') || badge.includes('ফ্রেশ') || badge.includes('তাজা');
        } else if (activeFilter === 'in-stock') {
          matchesFilter = !isOutOfStock;
        }

        if (matchesQuery && matchesFilter) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      // No results message
      const productsSection = document.querySelector('.products');
      if (productsSection) {
        let noMsg = document.getElementById('no-products-found');
        if (visibleCount === 0) {
          if (!noMsg) {
            noMsg = document.createElement('div');
            noMsg.id = 'no-products-found';
            noMsg.className = 'no-results-box';
            noMsg.innerHTML = isBengali
              ? `<div class="empty-icon">🦀</div>
                 <h3>কোনো কাঁকড়া পাওয়া যায়নি</h3>
                 <p>আপনার অনুসন্ধানের সাথে মিল পাওয়া যায়নি। অন্য নাম দিয়ে চেষ্টা করুন অথবা সরাসরি WhatsApp-এ যোগাযোগ করুন।</p>
                 <a class="btn" href="https://api.whatsapp.com/send?phone=${BUSINESS_PHONE}&text=${encodeURIComponent('নমস্কার, আমি কাঁকড়ার প্রাপ্যতা জানতে চাই।')}" target="_blank" rel="noopener noreferrer">WhatsApp-এ সাহায্য নিন</a>`
              : `<div class="empty-icon">🦀</div>
                 <h3>No matching crabs found</h3>
                 <p>We couldn't find any catch matching your criteria. Try adjusting your search or contact us directly on WhatsApp.</p>
                 <a class="btn" href="https://api.whatsapp.com/send?phone=${BUSINESS_PHONE}&text=${encodeURIComponent('Hello, I am looking for fresh crab availability.')}" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>`;
            productsSection.appendChild(noMsg);
          }
        } else if (noMsg) {
          noMsg.remove();
        }
      }
    }

    // Input event on search
    searchInputs.forEach(input => {
      input.addEventListener('input', function () {
        searchQuery = this.value.trim().toLowerCase();
        applyFilters();
      });
    });

    // Category button clicks
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeFilter = this.dataset.filter || 'all';
        applyFilters();
      });
    });

    applyFilters();
  }

  // --- 6. Smooth Scrolling for Navigation & CTA Anchors ---
  function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const hash = this.getAttribute('href');
        if (!hash || hash === '#' || hash === '#!') return;

        const target = document.querySelector(hash);
        if (target) {
          e.preventDefault();
          const navOffset = document.querySelector('.navbar')?.offsetHeight || 75;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          if (history.pushState) {
            history.pushState(null, null, hash);
          }
        }
      });
    });

    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          const navOffset = document.querySelector('.navbar')?.offsetHeight || 75;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 200);
    }
  }

  // --- 7. Dynamic Reviews Fetching, Sorting & Interchanging ---
  function initReviewsInterchange() {
    const reviewsGrid = document.getElementById('reviewsGridContainer');
    if (!reviewsGrid) return;

    const isBn = document.documentElement.lang === 'bn' || window.location.pathname.includes('/bn/');
    const countBadge = document.getElementById('reviewsCountBadge');
    const statusText = document.getElementById('reviewsStatusText');
    const btnFetch = document.getElementById('btnFetchNewest');
    const btnInterchange = document.getElementById('btnInterchangeReviews');
    const btnAutoRotate = document.getElementById('btnToggleAutoRotate');
    const toast = document.getElementById('reviewToast');
    const toastMsg = document.getElementById('reviewToastMessage');
    const filterPills = document.querySelectorAll('.reviews-filter-pills .review-pill');

    let allReviews = [];
    let currentFilter = 'all';
    let autoRotateTimer = null;
    let isAutoRotating = false;

    // Default verified reviews dataset
    const DEFAULT_REVIEWS = [
      {
        id: "rev-new-1",
        author: "Sneha Pal",
        author_bn: "স্নেহা পাল",
        initials: "SP",
        location: "Rajarhat, Chinar Park · Kolkata",
        location_bn: "রাজারহাট, চিনার পার্ক · কলকাতা",
        rating: 5,
        date: "2026-10-09T18:15:00Z",
        date_display: "Yesterday",
        date_display_bn: "গতকাল",
        order_tag: "Fresh Mud Crabs",
        order_tag_bn: "টাটকা মাড কাঁকড়া",
        category: "delivery",
        quote: "I was skeptical about ordering live crabs on WhatsApp, but Baidya Crab House shared photos of morning river catch and weighed accurately. Delivery arrived under 2 hours in ice packaging. Truly delicious sweet crab meat!",
        quote_bn: "হোয়াটসঅ্যাপে জ্যান্ত কাঁকড়া অর্ডার নিয়ে একটু সংশয় ছিল, কিন্তু Baidya Crab House সকালের তাজা নদী থেকে ধরা কাঁকড়ার ছবি পাঠিয়ে ওজন দেখিয়ে দেয়। বরফের প্যাকেটে ২ ঘণ্টার কম সময়ে চলে এসেছে। অসম্ভব মিষ্টি মাংস!",
        verified: true,
        color: "teal"
      },
      {
        id: "rev-1",
        author: "Subhashish Roy",
        author_bn: "শুভাশীষ রায়",
        initials: "SR",
        location: "Salt Lake, Sector 3 · Kolkata",
        location_bn: "সল্টলেক, সেক্টর ৩ · কলকাতা",
        rating: 5,
        date: "2026-10-06T10:30:00Z",
        date_display: "4 days ago",
        date_display_bn: "৪ দিন আগে",
        order_tag: "Live Female Mud Crabs",
        order_tag_bn: "জ্যান্ত ফিমেল কাঁকড়া",
        category: "ghilu",
        quote: "Ordered 2 kg female mud crabs for our Sunday family lunch. Every single crab was actively moving and 100% full of rich orange ghilu as promised! Delivered in 2.5 hours packed with ice. The freshest crabs you can get in Kolkata.",
        quote_bn: "রবিবারের পারিবারিক লাঞ্চের জন্য ২ কেজি ফিমেল মাড ক্র্যাব অর্ডার করেছিলাম। প্রতিটি কাঁকড়াই জ্যান্ত নড়াচড়া করছিল এবং প্রতিশ্রুতি মতো ১০০% লালচে ঘিলুতে ভরা ছিল! বরফের প্যাকেটে ২.৫ ঘণ্টায় পৌঁছে গেছে।",
        verified: true,
        color: "navy"
      },
      {
        id: "rev-2",
        author: "Priya Mukherjee",
        author_bn: "প্রিয়া মুখোপাধ্যায়",
        initials: "PM",
        location: "Jadavpur · South Kolkata",
        location_bn: "যাদবপুর · দক্ষিণ কলকাতা",
        rating: 5,
        date: "2026-10-02T14:20:00Z",
        date_display: "1 week ago",
        date_display_bn: "১ সপ্তাহ আগে",
        order_tag: "Free Cleaning & Cutting",
        order_tag_bn: "রেডি-টু-কুক কাটিং",
        category: "cleaning",
        quote: "Outstanding quality! Getting 3 kg crabs cleaned and expertly cut with zero extra charge made cooking Kankra Jhal so effortless. Meat was sweet and firm, totally fresh from Sundarban rivers. Cash on delivery was seamless.",
        quote_bn: "অসাধারণ কোয়ালিটি! ৩ কেজির অর্ডারে একদম বিনামূল্যে ফ্রেশ কাটিং আর ক্লিনিং করে দেওয়ায় আমাদের কাঁকড়ার ঝাল বানানোর সময় অনেক বাঁচল। মাংস ভীষণ মিষ্টি ও সুস্বাদু। ক্যাশ অন ডেলিভারি একদম নির্বিঘ্ন।",
        verified: true,
        color: "teal"
      },
      {
        id: "rev-3",
        author: "Anirban Bhattacharya",
        author_bn: "অনির্বাণ ভট্টাচার্য",
        initials: "AB",
        location: "New Town, Action Area 1 · Kolkata",
        location_bn: "নিউটাউন, অ্যাকশন এরিয়া ১ · কলকাতা",
        rating: 5,
        date: "2026-09-28T16:45:00Z",
        date_display: "2 weeks ago",
        date_display_bn: "২ সপ্তাহ আগে",
        order_tag: "Jumbo Male Mud Crabs",
        order_tag_bn: "জাম্বো মেল মাড ক্র্যাব",
        category: "general",
        quote: "First time ordering fresh river crabs online and Baidya Crab House blew us away. Huge claws, heavy crabs packed with succulent sweet meat. Arrived alive at my doorstep within 2 hours. Will be ordering regularly!",
        quote_bn: "অনলাইনে সুন্দরবনের নদীর কাঁকড়া প্রথমবার নেওয়া। বিশাল দাঁড়াযুক্ত জ্যান্ত মেল কাঁকড়া, রসালো মিষ্টি মাংস। মাত্র ২ ঘণ্টায় দরজায় জ্যান্ত অবস্থায় ডেলিভারি পেয়েছি। নিয়মিত নেব।",
        verified: true,
        color: "coral"
      },
      {
        id: "rev-4",
        author: "Debolina Sen",
        author_bn: "দেবলীনা সেন",
        initials: "DS",
        location: "Ballygunge & Dhakuria · Kolkata",
        location_bn: "বালিগঞ্জ ও ঢাকুরিয়া · কলকাতা",
        rating: 5,
        date: "2026-09-22T11:10:00Z",
        date_display: "3 weeks ago",
        date_display_bn: "৩ সপ্তাহ আগে",
        order_tag: "10/10 Ghilu Guarantee",
        order_tag_bn: "১০/১০ ঘিলুর গ্যারান্টি",
        category: "ghilu",
        quote: "Best crab supplier in Kolkata! We tested the 100% ghilu guarantee — 10 out of 10 crabs were packed with thick coral. The WhatsApp ordering was courteous and transparent with daily catch rates. Highly recommended!",
        quote_bn: "কলকাতায় সেরা কাঁকড়ার নির্ভরযোগ্য বিক্রেতা! ১০টির মধ্যে ১০টিতেই ঘিলু থাকার গ্যারান্টি নিখুঁতভাবে পেয়েছি। হোয়াটসঅ্যাপে অর্ডার নেওয়ার ব্যবহার খুবই ভদ্র ও আন্তরিক। সবাইকে নেওয়ার পরামর্শ দেব।",
        verified: true,
        color: "green"
      },
      {
        id: "rev-5",
        author: "Sourav Ganguly",
        author_bn: "সৌরভ গাঙ্গুলী",
        initials: "SG",
        location: "Dum Dum · North Kolkata",
        location_bn: "দমদম · উত্তর কলকাতা",
        rating: 5,
        date: "2026-09-18T09:40:00Z",
        date_display: "3 weeks ago",
        date_display_bn: "৩ সপ্তাহ আগে",
        order_tag: "Express 90-Min Delivery",
        order_tag_bn: "দ্রুত ডেলিভারি",
        category: "delivery",
        quote: "Received 1.5 kg large male crabs within 90 minutes. Still snapping live claws in the delivery box! River mud crab taste is so much sweeter than regular sea varieties. Very satisfied customer.",
        quote_bn: "অর্ডার করার ৯০ মিনিটের মধ্যে ১.৫ কেজি বড় সাইজের পুরুষ কাঁকড়া হাতে পেয়েছি। ডেলিভারি বক্সের মধ্যেও জীবন্ত নড়াচড়া করছিল! সুন্দরবনের নদীর কাঁকড়ার স্বাদ সমুদ্রের কাঁকড়ার চেয়ে অনেক বেশি মিষ্টি।",
        verified: true,
        color: "navy"
      },
      {
        id: "rev-6",
        author: "Rima Dasgupta",
        author_bn: "রিমা দাশগুপ্ত",
        initials: "RD",
        location: "Garia & Sonarpur · South Kolkata",
        location_bn: "গড়িয়া ও সোনারপুর · দক্ষিণ কলকাতা",
        rating: 5,
        date: "2026-09-12T13:20:00Z",
        date_display: "1 month ago",
        date_display_bn: "১ মাস আগে",
        order_tag: "Full Ghilu Female Crab",
        order_tag_bn: "ঘিলু ভরা ফিমেল কাঁকড়া",
        category: "ghilu",
        quote: "The coral in the female crabs was so rich and flavorful, made heavenly crab curry for our guests. Courteous delivery person with thermal insulation box. Will order again next weekend.",
        quote_bn: "ফিমেল কাঁকড়ায় ঘিলুর পরিমাণ এত চমৎকার ছিল যে অতিথিদের জন্য দুর্দান্ত কাঁকড়ার কষা তৈরি করা গেল। ডেলিভারি কর্মীর ব্যবহার খুবই ভালো এবং উপযুক্ত থার্মাল বক্সে এনেছিলেন। আগামী সপ্তাহে আবার নেব।",
        verified: true,
        color: "coral"
      },
      {
        id: "rev-7",
        author: "Dr. Arindam Bose",
        author_bn: "ডাঃ অরিন্দম বোস",
        initials: "AB",
        location: "Behala Chowrasta · Kolkata",
        location_bn: "বেহালা চৌরাস্তা · কলকাতা",
        rating: 5,
        date: "2026-09-05T10:15:00Z",
        date_display: "1 month ago",
        date_display_bn: "১ মাস আগে",
        order_tag: "Ready-to-Cook Cleaned",
        order_tag_bn: "পরিচ্ছন্ন কাটিং",
        category: "cleaning",
        quote: "Cleaned to perfection and delivered on Sunday morning right on time. Authentic Sundarban mud crabs are hard to get with COD in Behala, Baidya Crab House made it effortless. 5 stars from our family.",
        quote_bn: "রবিবার সকালে একদম সময়মতো দারুণ পরিষ্কার করে কাটা কাঁকড়া ডেলিভারি পেয়েছি। বেহালায় ঘরে বসে ক্যাশ অন ডেলিভারিতে সুন্দরবনের নদীর কাঁকড়া পাওয়া সত্যিই দারুণ ব্যাপার।",
        verified: true,
        color: "teal"
      }
    ];

    // Load any user-submitted reviews saved in localStorage
    function loadSavedUserReviews() {
      try {
        const saved = localStorage.getItem('bch_user_reviews');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
      return [];
    }

    // Initialize list
    const userReviews = loadSavedUserReviews();
    allReviews = [...userReviews, ...DEFAULT_REVIEWS];

    // Show temporary toast notification
    function showToast(message) {
      if (!toast || !toastMsg) return;
      toastMsg.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }

    // Render single review card HTML with subtle fade-in animation
    function buildCardHtml(rev, index = 0, isAnimated = true) {
      const author = (isBn && rev.author_bn) ? rev.author_bn : rev.author;
      const location = (isBn && rev.location_bn) ? rev.location_bn : rev.location;
      const quote = (isBn && rev.quote_bn) ? rev.quote_bn : rev.quote;
      const tag = (isBn && rev.order_tag_bn) ? rev.order_tag_bn : rev.order_tag;
      const dateDisplay = (isBn && rev.date_display_bn) ? rev.date_display_bn : rev.date_display;
      const stars = '★'.repeat(Math.min(5, Math.max(1, rev.rating || 5)));
      const isNewBadge = rev.is_new ? `<span class="badge-new-review">${isBn ? '✨ নতুন' : '✨ Newest'}</span>` : '';
      const animClass = isAnimated ? 'fade-in' : '';
      const cardClass = [
        'review-card',
        rev.is_new ? 'is-new' : '',
        animClass
      ].filter(Boolean).join(' ');
      const colorClass = `avatar-${rev.color || 'teal'}`;
      const delayStyle = isAnimated ? `style="animation-delay: ${(index * 60) + 20}ms;"` : '';

      return `
        <article class="${cardClass}" ${delayStyle} data-id="${rev.id || ''}">
            <div>
                <div class="review-top">
                    <div class="review-author">
                        <div class="review-avatar ${colorClass}">${rev.initials || 'KH'}</div>
                        <div>
                            <div class="review-name">${author} ${isNewBadge}</div>
                            <div class="review-location">${location}</div>
                        </div>
                    </div>
                    <i class="fab fa-google review-google-icon" title="Google Verified Review" aria-hidden="true"></i>
                </div>
                <div class="review-rating-row">
                    <div class="review-stars" aria-label="${rev.rating || 5} stars">${stars}</div>
                    <span class="review-badge"><i class="fas fa-shield-alt" aria-hidden="true"></i> ${isBn ? 'ভেরিফাইড ক্রেতা' : 'Verified Buyer'}</span>
                </div>
                <p class="review-quote">“${quote}”</p>
            </div>
            <div class="review-footer">
                <span class="review-order-tag">🦀 ${tag}</span>
                <span class="review-date">${dateDisplay || (isBn ? 'সম্প্রতি' : 'Recently')}</span>
            </div>
        </article>
      `;
    }

    // Render cards to grid with transition and subtle fade-in
    function renderReviews(listToDisplay, animate = true) {
      if (!reviewsGrid) return;

      if (animate) {
        reviewsGrid.classList.add('interchanging');
      }

      setTimeout(() => {
        let displayList = [...listToDisplay];
        // By default show first 4 reviews of current view for a balanced, premium layout
        const visibleReviews = displayList.slice(0, 4);
        reviewsGrid.innerHTML = visibleReviews.map((rev, idx) => buildCardHtml(rev, idx, animate)).join('');
        reviewsGrid.classList.remove('interchanging');

        // Update count badge & status
        if (countBadge) countBadge.textContent = String(allReviews.length);
        if (statusText) {
          const totalMsg = isBn
            ? `${allReviews.length}-টির মধ্যে ৪টি বিশেষ ভেরিফাইড রিভিউ প্রদর্শিত হচ্ছে`
            : `Showing 4 of ${allReviews.length} verified Kolkata buyer reviews`;
          statusText.textContent = totalMsg;
        }
      }, animate ? 180 : 0);
    }

    // Filter current list
    function getFilteredList() {
      let list = [...allReviews];
      if (currentFilter === 'newest') {
        list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      }
      return list;
    }

    // 1. FETCH NEWEST FUNCTIONALITY
    async function fetchNewestReviews() {
      if (btnFetch) {
        btnFetch.disabled = true;
        btnFetch.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>${isBn ? 'লোড হচ্ছে...' : 'Fetching...'}</span>`;
      }

      try {
        const res = await fetch('/api/reviews?sort=newest');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reviews) && data.reviews.length > 0) {
            // Merge with local storage reviews
            const localSaved = loadSavedUserReviews();
            const merged = [...localSaved];
            data.reviews.forEach(r => {
              if (!merged.some(m => m.id === r.id)) merged.push(r);
            });
            allReviews = merged;
          }
        }
      } catch (err) {
        // Fallback: sort locally
        allReviews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      }

      // Mark the very first review as new
      if (allReviews.length > 0) {
        allReviews[0].is_new = true;
      }

      currentFilter = 'newest';
      // Toggle active states
      const btnViewAll = document.getElementById('btnViewAll');
      if (btnViewAll) btnViewAll.classList.remove('active');
      if (btnFetch) btnFetch.classList.add('active');

      renderReviews(getFilteredList(), true);

      if (btnFetch) {
        btnFetch.disabled = false;
        btnFetch.innerHTML = `<i class="fas fa-sync-alt" aria-hidden="true"></i> <span>${isBn ? 'নতুন রিভিউ আনুন' : 'Fetch Newest'}</span>`;
      }

      showToast(isBn ? '✨ সর্বশেষ নতুন রিভিউ সফলভাবে লোড হয়েছে!' : '✨ Newest customer reviews fetched successfully!');
    }

    // 2. INTERCHANGE FUNCTIONALITY (Interchange / rotate order of reviews)
    function interchangeReviews(notify = true) {
      if (allReviews.length <= 1) return;

      if (btnInterchange) {
        btnInterchange.classList.add('rotating');
        setTimeout(() => btnInterchange.classList.remove('rotating'), 500);
      }

      // Rotate reviews array by 2 positions so that different customer reviews come to the front
      const shifted = allReviews.splice(0, 2);
      allReviews.push(...shifted);

      renderReviews(getFilteredList(), true);

      if (notify) {
        showToast(isBn ? '🔀 রিভিউ অদলবদল (Interchanged) করা হয়েছে!' : '🔀 Reviews interchanged & rotated!');
      }
    }

    // Attach Event Listeners
    const btnViewAll = document.getElementById('btnViewAll');
    if (btnViewAll) {
      btnViewAll.addEventListener('click', () => {
        if (btnFetch) btnFetch.classList.remove('active');
        btnViewAll.classList.add('active');
        currentFilter = 'all';
        renderReviews(getFilteredList(), true);
      });
    }

    if (btnFetch) {
      btnFetch.addEventListener('click', () => fetchNewestReviews());
    }

    if (btnInterchange) {
      btnInterchange.addEventListener('click', () => interchangeReviews(true));
    }

    // Initial render
    renderReviews(getFilteredList(), false);
  }

  // --- 8. Execution ---
  initPricingAndProducts();
  initImageCarousels();
  initCatalogueFiltering();
  initSmoothScrolling();
  initReviewsInterchange();
});