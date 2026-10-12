document.addEventListener('DOMContentLoaded', () => {
  const setupPanel = document.getElementById('adminSetup');
  const loginPanel = document.getElementById('adminLoginPanel');
  const pricesPanel = document.getElementById('adminPricesPanel');
  const reviewsPanel = document.getElementById('adminReviewsPanel');
  const navigation = document.getElementById('adminNavigation');
  const pricesTab = document.getElementById('adminPricesTab');
  const reviewsTab = document.getElementById('adminReviewsTab');
  const loginForm = document.getElementById('adminLoginForm');
  const pricesForm = document.getElementById('adminPricesForm');
  const reviewForm = document.getElementById('adminReviewForm');
  const productList = document.getElementById('adminProductList');
  const reviewList = document.getElementById('adminReviewsList');
  const status = document.getElementById('adminStatus');
  const loginStatus = document.getElementById('adminLoginStatus');
  const reviewStatus = document.getElementById('adminReviewStatus');
  const saveButton = document.getElementById('adminSaveButton');
  const reviewSaveButton = document.getElementById('adminReviewSaveButton');
  const logoutButton = document.getElementById('adminLogout');
  const passwordInput = document.getElementById('adminPassword');
  const updatedLabel = document.getElementById('adminLastUpdated');
  const verificationDate = document.getElementById('priceVerificationDate');
  const reviewFormHeading = document.getElementById('adminReviewFormHeading');
  const reviewSaveLabel = reviewSaveButton.textContent;
  const reviewFields = ['name', 'rating', 'time', 'location', 'order_tag', 'name_bn', 'text', 'text_bn', 'time_bn', 'verified'];
  let reviews = [];
  let editingReviewId = null;

  function setStatus(message, isError = false, target = status) {
    target.textContent = message;
    target.classList.toggle('error', isError);
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  }

  function showTab(tab) {
    const showReviews = tab === 'reviews';
    pricesPanel.hidden = showReviews;
    reviewsPanel.hidden = !showReviews;
    pricesTab.classList.toggle('active', !showReviews);
    pricesTab.setAttribute('aria-selected', String(!showReviews));
    reviewsTab.classList.toggle('active', showReviews);
    reviewsTab.setAttribute('aria-selected', String(showReviews));
    if (showReviews) loadReviews();
  }

  function renderProducts(data) {
    productList.replaceChildren();
    for (const product of data.products) {
      const card = document.createElement('article');
      card.className = 'admin-product';
      card.dataset.productId = product.id;

      const heading = document.createElement('div');
      heading.className = 'admin-product-heading';
      const title = document.createElement('div');
      const name = document.createElement('h3');
      name.textContent = product.name;
      const translatedName = document.createElement('p');
      translatedName.textContent = product.name_bn;
      title.append(name, translatedName);
      const stockLabel = document.createElement('label');
      stockLabel.className = `admin-stock-toggle${product.in_stock ? ' is-in-stock' : ' is-out-of-stock'}`;
      const stockText = document.createElement('span');
      stockText.textContent = product.in_stock ? 'IN STOCK' : 'OUT OF STOCK';
      const stockInput = document.createElement('input');
      stockInput.type = 'checkbox';
      stockInput.className = 'admin-stock-input';
      stockInput.checked = product.in_stock;
      stockInput.setAttribute('aria-label', `Available: ${product.name}`);
      stockLabel.append(stockInput, stockText);
      stockInput.addEventListener('change', () => {
        stockLabel.classList.toggle('is-in-stock', stockInput.checked);
        stockLabel.classList.toggle('is-out-of-stock', !stockInput.checked);
        stockText.textContent = stockInput.checked ? 'IN STOCK' : 'OUT OF STOCK';
      });
      heading.append(title, stockLabel);
      card.append(heading);

      const summary = document.createElement('div');
      summary.className = 'admin-price-summary';
      for (const [label, value] of [
        ['STARTING PRICE (₹)', ''],
        ['DISPLAYED PRICE RANGE', '']
      ]) {
        const item = document.createElement('div');
        const caption = document.createElement('span');
        caption.textContent = label;
        const amount = document.createElement('strong');
        amount.textContent = value;
        item.append(caption, amount);
        summary.append(item);
      }
      card.append(summary);

      const grades = document.createElement('div');
      grades.className = 'admin-grade-grid';
      const gradesHeader = document.createElement('div');
      gradesHeader.className = 'admin-grade-heading';
      const gradesTitle = document.createElement('strong');
      gradesTitle.textContent = 'GRADE-WISE PER-KG RATES';
      const gradeQuickActions = document.createElement('div');
      gradeQuickActions.className = 'admin-grade-quick-actions';
      for (const delta of [50, -50]) {
        const shift = document.createElement('button');
        shift.type = 'button';
        shift.className = 'btn-chip';
        shift.textContent = `${delta > 0 ? '+' : '-'}₹${Math.abs(delta)}`;
        shift.addEventListener('click', () => shiftProductPrices(card, delta));
        gradeQuickActions.append(shift);
      }
      gradesHeader.append(gradesTitle, gradeQuickActions);
      grades.append(gradesHeader);
      for (const [grade, price] of Object.entries(product.grades)) {
        const label = document.createElement('label');
        label.className = 'admin-grade-field';
        const name = document.createElement('span');
        name.textContent = grade;
        const field = document.createElement('span');
        field.className = 'admin-price-field';
        const prefix = document.createElement('span');
        prefix.textContent = '₹';
        const input = document.createElement('input');
        input.className = 'admin-grade-price';
        input.type = 'number';
        input.min = '1';
        input.max = '1000000';
        input.step = '1';
        input.required = true;
        input.value = String(price);
        input.dataset.grade = grade;
        input.setAttribute('aria-label', `${product.name} ${grade} price in rupees`);
        input.addEventListener('input', () => updateProductSummary(card));
        field.append(prefix, input);
        label.append(name, field);
        grades.append(label);
      }
      card.append(grades);
      productList.append(card);
      updateProductSummary(card);
    }
    verificationDate.value = data.last_updated || new Date().toISOString().slice(0, 10);
    updatedLabel.textContent = data.last_updated ? `Last verified: ${data.last_updated}` : '';
  }

  function shiftProductPrices(card, delta) {
    card.querySelectorAll('.admin-grade-price').forEach(input => {
      const current = Number(input.value);
      input.value = String(Math.min(1_000_000, Math.max(1, (Number.isFinite(current) ? current : 1) + delta)));
    });
    updateProductSummary(card);
  }

  function updateProductSummary(card) {
    const prices = Array.from(card.querySelectorAll('.admin-grade-price'), input => Number(input.value))
      .filter(price => Number.isFinite(price) && price > 0);
    if (!prices.length) return;
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    const amounts = card.querySelectorAll('.admin-price-summary strong');
    amounts[0].textContent = formatPrice(minimum);
    amounts[1].textContent = `${formatPrice(minimum)} – ${formatPrice(maximum)}`;
  }

  function shiftAllPrices(delta) {
    productList.querySelectorAll('.admin-product').forEach(card => shiftProductPrices(card, delta));
  }

  async function loadPrices() {
    const data = await requestJson('/api/admin-prices');
    renderProducts(data);
    loginPanel.hidden = true;
    setupPanel.hidden = true;
    pricesPanel.hidden = false;
    reviewsPanel.hidden = true;
    navigation.hidden = false;
    logoutButton.hidden = false;
  }

  function updateReviewSummary() {
    const average = reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : null;
    document.getElementById('adminReviewAverage').textContent =
      average === null ? '—' : `${average.toFixed(1)} ★`;
    document.getElementById('adminReviewCount').textContent =
      `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`;
    document.getElementById('adminReviewsBadge').textContent = String(reviews.length);
  }

  function renderReviews() {
    reviewList.replaceChildren();
    updateReviewSummary();

    if (reviews.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'admin-review-empty';
      empty.textContent = 'No customer reviews yet. Add one using the form above.';
      reviewList.append(empty);
      return;
    }

    for (const review of reviews) {
      const card = document.createElement('article');
      card.className = 'admin-review-item';

      const heading = document.createElement('div');
      heading.className = 'admin-review-item-heading';
      const customer = document.createElement('div');
      const name = document.createElement('h3');
      name.textContent = review.name;
      const detail = document.createElement('p');
      detail.textContent = [review.location, review.time].filter(Boolean).join(' · ');
      customer.append(name, detail);
      const stars = document.createElement('span');
      stars.className = 'review-stars';
      stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
      stars.textContent = '★'.repeat(review.rating);
      heading.append(customer, stars);
      card.append(heading);

      const quote = document.createElement('p');
      quote.className = 'admin-review-quote';
      quote.textContent = review.text;
      card.append(quote);

      const tags = document.createElement('div');
      tags.className = 'admin-review-item-tags';
      for (const text of [
        review.order_tag,
        review.name_bn,
        review.verified ? 'Verified customer' : ''
      ].filter(Boolean)) {
        const tag = document.createElement('span');
        tag.textContent = text;
        tags.append(tag);
      }
      if (tags.childElementCount) card.append(tags);

      const actions = document.createElement('div');
      actions.className = 'admin-review-item-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn secondary';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => editReview(review));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn admin-delete-review';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteReview(review));
      actions.append(editButton, deleteButton);
      card.append(actions);
      reviewList.append(card);
    }
  }

  async function loadReviews() {
    const refreshButton = document.getElementById('adminRefreshReviews');
    refreshButton.disabled = true;
    setStatus('Loading reviews…', false, reviewStatus);
    try {
      const data = await requestJson('/api/admin-reviews');
      if (!Array.isArray(data.reviews)) throw new Error('The reviews response has an invalid format.');
      reviews = data.reviews;
      renderReviews();
      setStatus('', false, reviewStatus);
    } catch (error) {
      setStatus(error.message, true, reviewStatus);
    } finally {
      refreshButton.disabled = false;
    }
  }

  function resetReviewForm() {
    editingReviewId = null;
    reviewForm.reset();
    reviewForm.elements.time.value = 'Just now';
    reviewFormHeading.textContent = 'Add customer review';
    reviewSaveButton.textContent = reviewSaveLabel;
  }

  function editReview(review) {
    editingReviewId = review.id;
    for (const field of reviewFields) {
      const input = reviewForm.elements[field];
      if (input.type === 'checkbox') {
        input.checked = Boolean(review[field]);
      } else {
        input.value = field === 'rating' ? String(review.rating) : (review[field] || '');
      }
    }
    reviewFormHeading.textContent = `Edit review by ${review.name}`;
    reviewSaveButton.textContent = 'Save changes';
    reviewForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    reviewForm.elements.name.focus();
  }

  async function persistReviews(nextReviews, successMessage) {
    reviewSaveButton.disabled = true;
    setStatus('Saving reviews…', false, reviewStatus);
    try {
      const result = await requestJson('/api/admin-reviews', {
        method: 'PUT',
        body: JSON.stringify({ reviews: nextReviews })
      });
      reviews = result.reviews;
      renderReviews();
      setStatus(successMessage, false, reviewStatus);
      return true;
    } catch (error) {
      setStatus(error.message, true, reviewStatus);
      return false;
    } finally {
      reviewSaveButton.disabled = false;
    }
  }

  async function deleteReview(review) {
    if (!window.confirm(`Delete the review by ${review.name}?`)) return;
    await persistReviews(reviews.filter(item => item.id !== review.id), 'Review deleted.');
  }

  async function checkSession() {
    try {
      const session = await requestJson('/api/admin-session');
      if (!session.configured) {
        setupPanel.hidden = false;
        return;
      }
      if (session.authenticated) {
        await loadPrices();
      } else {
        loginPanel.hidden = false;
        passwordInput.focus();
      }
    } catch (error) {
      setStatus(error.message, true, loginStatus);
      loginPanel.hidden = false;
    }
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await requestJson('/api/admin-session', {
        method: 'POST',
        body: JSON.stringify({
          password: passwordInput.value,
          remember: document.getElementById('adminRemember').checked
        })
      });
      loginForm.reset();
      await loadPrices();
      setStatus('');
    } catch (error) {
      setStatus(error.message, true, loginStatus);
    } finally {
      submitButton.disabled = false;
    }
  });

  pricesForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!pricesForm.reportValidity()) return;
    if (!window.confirm('Publish these price and availability changes to the product pages?')) return;

    const products = Array.from(productList.querySelectorAll('.admin-product'), card => {
      const grades = {};
      card.querySelectorAll('.admin-grade-price').forEach(input => {
        grades[input.dataset.grade] = Number(input.value);
      });
      return {
        id: card.dataset.productId,
        in_stock: card.querySelector('.admin-stock-input').checked,
        grades
      };
    });

    saveButton.disabled = true;
    setStatus('Saving updates…');
    try {
      const result = await requestJson('/api/admin-prices', {
        method: 'PUT',
        body: JSON.stringify({
          products,
          last_updated: verificationDate.value
        })
      });
      renderProducts(result.prices);
      setStatus('Prices and inventory updated successfully.');
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  reviewForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!reviewForm.reportValidity()) return;

    const formData = new FormData(reviewForm);
    const existing = reviews.find(review => review.id === editingReviewId);
    const review = {
      ...(existing || {}),
      id: editingReviewId ?? (Math.max(0, ...reviews.map(item => item.id)) + 1),
      name: String(formData.get('name')).trim(),
      rating: Number(formData.get('rating')),
      text: String(formData.get('text')).trim(),
      time: String(formData.get('time')).trim(),
      verified: reviewForm.elements.verified.checked
    };
    for (const field of ['location', 'order_tag', 'name_bn', 'text_bn', 'time_bn']) {
      const value = String(formData.get(field) || '').trim();
      if (value) review[field] = value;
      else delete review[field];
    }

    const nextReviews = editingReviewId === null
      ? [review, ...reviews]
      : reviews.map(item => item.id === editingReviewId ? review : item);
    const message = editingReviewId === null ? 'Review added to the storefront.' : 'Review updated.';
    if (await persistReviews(nextReviews, message)) resetReviewForm();
  });

  pricesTab.addEventListener('click', () => showTab('prices'));
  reviewsTab.addEventListener('click', () => showTab('reviews'));
  document.getElementById('adminRefreshReviews').addEventListener('click', loadReviews);
  document.getElementById('setPriceDateToday').addEventListener('click', () => {
    verificationDate.value = new Date().toISOString().slice(0, 10);
  });
  document.querySelectorAll('[data-global-price-shift]').forEach(button => {
    button.addEventListener('click', () => shiftAllPrices(Number(button.dataset.globalPriceShift)));
  });
  document.getElementById('setAllProductsInStock').addEventListener('click', () => {
    productList.querySelectorAll('.admin-stock-input').forEach(input => {
      if (!input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change'));
      }
    });
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await requestJson('/api/admin-session', { method: 'DELETE' });
      pricesPanel.hidden = true;
      reviewsPanel.hidden = true;
      navigation.hidden = true;
      logoutButton.hidden = true;
      loginPanel.hidden = false;
      setStatus('You have signed out.');
      passwordInput.focus();
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      logoutButton.disabled = false;
    }
  });

  checkSession();
});
