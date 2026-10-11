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

  // --- 7. Google Business Profile Reviews ---
  function initGoogleReviews() {
    const reviewsGrid = document.getElementById('reviewsGridContainer');
    if (!reviewsGrid) return;

    const isBn = document.documentElement.lang === 'bn' || window.location.pathname.includes('/bn/');
    const countBadge = document.getElementById('reviewsCountBadge');
    const statusText = document.getElementById('reviewsStatusText');
    const averageElement = document.getElementById('googleReviewAverage');
    const starsElement = document.getElementById('googleReviewStars');
    const ratingText = document.getElementById('googleReviewRatingText');
    const countText = document.getElementById('googleReviewCount');
    const labels = isBn
      ? {
          loading: 'গুগল থেকে রিভিউ লোড হচ্ছে…',
          error: 'এই মুহূর্তে গুগল রিভিউ লোড করা যাচ্ছে না। পরে আবার চেষ্টা করুন।',
          empty: 'এখনও কোনো গুগল রিভিউ পাওয়া যায়নি।',
          source: 'গুগল রিভিউ',
          anonymous: 'গুগল ব্যবহারকারী',
          count: 'টি গুগল রিভিউ',
          ratingUnavailable: 'গুগল বিজনেস রেটিং পাওয়া যাচ্ছে না',
          loaded: 'গুগল থেকে সব রিভিউ দেখানো হচ্ছে।'
        }
      : {
          loading: 'Loading reviews from Google…',
          error: 'Google reviews could not be loaded right now. Please try again later.',
          empty: 'No Google reviews are available yet.',
          source: 'Google review',
          anonymous: 'Google user',
          count: 'Google reviews',
          ratingUnavailable: 'Google Business rating unavailable',
          loaded: 'Showing all available reviews from Google.'
        };

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const ratingValue = value => ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 })[value] || 0;
    const formatDate = value => {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(isBn ? 'bn-IN' : 'en-IN', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    };

    function updateRating(averageRating, totalReviewCount) {
      const average = Number(averageRating);
      const validAverage = Number.isFinite(average) && average >= 0 && average <= 5;
      const localizedAverage = validAverage
        ? new Intl.NumberFormat(isBn ? 'bn-IN' : 'en-IN', { maximumFractionDigits: 1 }).format(average)
        : '';
      if (averageElement) averageElement.textContent = validAverage ? localizedAverage : '—';
      if (starsElement) starsElement.textContent = validAverage ? '★'.repeat(Math.round(average)) : '';
      if (starsElement) starsElement.setAttribute('aria-label', validAverage
        ? (isBn ? `৫-এর মধ্যে ${localizedAverage}` : `${average.toFixed(1)} out of 5`)
        : labels.ratingUnavailable);
      if (ratingText) ratingText.textContent = validAverage
        ? (isBn ? `৫-এর মধ্যে ${localizedAverage} · গুগল বিজনেস রেটিং` : `${average.toFixed(1)} out of 5 · Google Business rating`)
        : labels.ratingUnavailable;
      if (countText) countText.textContent = `${new Intl.NumberFormat(isBn ? 'bn-IN' : 'en-IN').format(totalReviewCount)} ${labels.count}`;
      if (countBadge) countBadge.textContent = `${isBn ? 'গুগল রিভিউ' : 'Google Reviews'} (${new Intl.NumberFormat(isBn ? 'bn-IN' : 'en-IN').format(totalReviewCount)})`;
    }

    function renderReviews(reviews) {
      reviewsGrid.setAttribute('aria-busy', 'false');
      if (reviews.length === 0) {
        reviewsGrid.textContent = labels.empty;
        return;
      }

      reviewsGrid.innerHTML = reviews.map((review, index) => {
        const authorName = review.reviewerName || labels.anonymous;
        const author = escapeHtml(authorName);
        const initial = escapeHtml(Array.from(authorName.trim())[0] || 'G');
        const comment = escapeHtml(review.comment || (isBn ? 'লিখিত মন্তব্য নেই।' : 'No written comment.'));
        const rating = ratingValue(review.starRating);
        const date = escapeHtml(formatDate(review.updateTime || review.createTime));
        const stars = '★'.repeat(rating);
        const delay = Math.min(index, 8) * 40;
        return `
          <article class="review-card fade-in" style="animation-delay: ${delay}ms;" data-id="${escapeHtml(review.reviewId)}">
            <div>
              <div class="review-top">
                <div class="review-author">
                  <div class="review-avatar avatar-teal">${initial}</div>
                  <div class="review-name">${author}</div>
                </div>
                <i class="fab fa-google review-google-icon" title="Google" aria-hidden="true"></i>
              </div>
              <div class="review-rating-row">
                <div class="review-stars" aria-label="${rating} ${isBn ? 'স্টার' : 'stars'}">${stars}</div>
                <span class="review-badge">${labels.source}</span>
              </div>
              <p class="review-quote">${comment}</p>
            </div>
            <div class="review-footer">
              <span class="review-order-tag">${labels.source}</span>
              <span class="review-date">${date}</span>
            </div>
          </article>`;
      }).join('');
    }

    async function loadGoogleReviews() {
      reviewsGrid.setAttribute('aria-busy', 'true');
      reviewsGrid.textContent = labels.loading;
      try {
        const response = await fetch('/api/reviews', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || labels.error);
        if (!Array.isArray(data.reviews)) throw new Error('The Google reviews response is invalid.');

        const reviews = data.reviews.slice().sort((left, right) =>
          new Date(right.updateTime || right.createTime || 0) - new Date(left.updateTime || left.createTime || 0)
        );
        updateRating(data.averageRating, data.totalReviewCount ?? reviews.length);
        renderReviews(reviews);
        if (statusText) statusText.textContent = labels.loaded;
      } catch (error) {
        console.error('Unable to display Google reviews:', error);
        reviewsGrid.setAttribute('aria-busy', 'false');
        reviewsGrid.textContent = labels.error;
        if (statusText) statusText.textContent = labels.error;
        if (countText) countText.textContent = labels.error;
      }
    }

    loadGoogleReviews();
  }

  // --- 8. Execution ---
  initPricingAndProducts();
  initImageCarousels();
  initCatalogueFiltering();
  initSmoothScrolling();
  initGoogleReviews();
});