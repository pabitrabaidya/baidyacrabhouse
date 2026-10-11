document.addEventListener('DOMContentLoaded', () => {
  const setupPanel = document.getElementById('adminSetup');
  const loginPanel = document.getElementById('adminLoginPanel');
  const pricesPanel = document.getElementById('adminPricesPanel');
  const loginForm = document.getElementById('adminLoginForm');
  const pricesForm = document.getElementById('adminPricesForm');
  const productList = document.getElementById('adminProductList');
  const status = document.getElementById('adminStatus');
  const loginStatus = document.getElementById('adminLoginStatus');
  const saveButton = document.getElementById('adminSaveButton');
  const logoutButton = document.getElementById('adminLogout');
  const passwordInput = document.getElementById('adminPassword');
  const updatedLabel = document.getElementById('adminLastUpdated');

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

  function renderProducts(data) {
    productList.replaceChildren();
    for (const product of data.products) {
      const card = document.createElement('fieldset');
      card.className = 'admin-product';
      card.dataset.productId = product.id;

      const legend = document.createElement('legend');
      legend.textContent = `${product.name} / ${product.name_bn}`;
      card.append(legend);

      const stockLabel = document.createElement('label');
      stockLabel.className = 'admin-stock-toggle';
      const stockInput = document.createElement('input');
      stockInput.type = 'checkbox';
      stockInput.className = 'admin-stock-input';
      stockInput.checked = product.in_stock;
      stockInput.setAttribute('aria-label', `Available: ${product.name}`);
      const stockText = document.createElement('span');
      stockText.textContent = 'Available for orders';
      stockLabel.append(stockInput, stockText);
      card.append(stockLabel);

      const grades = document.createElement('div');
      grades.className = 'admin-grade-grid';
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
        field.append(prefix, input);
        label.append(name, field);
        grades.append(label);
      }
      card.append(grades);
      productList.append(card);
    }
    updatedLabel.textContent = data.last_updated ? `Last updated: ${data.last_updated}` : '';
  }

  async function loadPrices() {
    const data = await requestJson('/api/admin/prices');
    renderProducts(data);
    loginPanel.hidden = true;
    setupPanel.hidden = true;
    pricesPanel.hidden = false;
    logoutButton.hidden = false;
  }

  async function checkSession() {
    try {
      const session = await requestJson('/api/admin/session');
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
      await requestJson('/api/admin/session', {
        method: 'POST',
        body: JSON.stringify({ password: passwordInput.value })
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
      const result = await requestJson('/api/admin/prices', {
        method: 'PUT',
        body: JSON.stringify({ products })
      });
      renderProducts(result.prices);
      setStatus('Prices and inventory updated successfully.');
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await requestJson('/api/admin/session', { method: 'DELETE' });
      pricesPanel.hidden = true;
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
