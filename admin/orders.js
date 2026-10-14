'use strict';

(function(){
  const loginPanel = document.getElementById('loginPanel');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const dashboardMessage = document.getElementById('dashboardMessage');
  const ordersBody = document.getElementById('ordersBody');
  const dialog = document.getElementById('orderDialog');
  const orderDetails = document.getElementById('orderDetails');
  let selectedOrder = null;

  const nextStatuses = {
    new: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
  };

  function el(tag, className, text){
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text !== undefined) node.textContent = text;
    return node;
  }

  function setMessage(node, message, success){
    node.textContent = message || '';
    node.classList.toggle('success', Boolean(success));
  }

  function formatMoney(paise){
    return new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR'}).format(paise / 100);
  }

  function formatDate(value){
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium', timeStyle: 'short'
    }).format(date);
  }

  function statusPill(status){
    const normalized = String(status || 'pending').toLowerCase();
    return el('span', 'status-pill status-' + normalized, normalized === 'captured' ? 'captured / paid' : normalized);
  }

  async function request(url, options){
    const response = await fetch(url, Object.assign({credentials: 'same-origin', cache: 'no-store'}, options || {}));
    let body = {};
    try{ body = await response.json(); } catch(error){ throw new Error('The server returned an unreadable response.'); }
    if(!response.ok){
      if(response.status === 401) showLogin();
      const error = new Error(body.error || 'The request could not be completed.');
      error.statusCode = response.status;
      throw error;
    }
    return body;
  }

  function showLogin(message){
    loginPanel.hidden = false;
    dashboard.hidden = true;
    document.getElementById('logoutButton').hidden = true;
    document.getElementById('signedInUser').hidden = true;
    if(message) setMessage(loginMessage, message);
  }

  function showDashboard(user){
    loginPanel.hidden = true;
    dashboard.hidden = false;
    document.getElementById('logoutButton').hidden = false;
    const signedIn = document.getElementById('signedInUser');
    signedIn.textContent = user.email + ' · ' + user.role;
    signedIn.hidden = false;
    setMessage(loginMessage, '');
  }

  async function checkSession(){
    try{
      const result = await request('/.netlify/functions/admin-auth');
      if(result.authenticated && result.user){
        showDashboard(result.user);
        await loadOrders();
      } else showLogin();
    } catch(error){
      showLogin(error.statusCode === 401 ? '' : error.message);
    }
  }

  function addCell(row, label, content, className){
    const cell = el('td', className);
    cell.dataset.label = label;
    if(typeof content === 'string') cell.textContent = content;
    else if(content) cell.append(content);
    row.append(cell);
    return cell;
  }

  function renderOrders(orders){
    ordersBody.replaceChildren();
    orders.forEach(function(order){
      const row = document.createElement('tr');
      addCell(row, 'Order', order.orderRef, 'order-ref');
      addCell(row, 'Created', formatDate(order.createdAt));
      const customer = el('div', 'customer-cell');
      customer.append(el('strong', '', order.customer.name));
      customer.append(el('small', '', order.customer.contact + ' · ' + order.customer.phone));
      addCell(row, 'Customer', customer, 'customer-cell');
      addCell(row, 'Payment', statusPill(order.paymentStatus));
      addCell(row, 'Order status', statusPill(order.orderStatus));
      addCell(row, 'Total', formatMoney(order.totalPaise), 'money');
      const details = el('button', 'details-button', 'View');
      details.type = 'button';
      details.addEventListener('click', function(){ openOrder(order); });
      addCell(row, 'Details', details);
      ordersBody.append(row);
    });
    document.getElementById('orderCount').textContent =
      orders.length + (orders.length === 1 ? ' order' : ' orders') + ' shown';
  }

  function filterQuery(){
    const query = new URLSearchParams();
    const values = {
      search: document.getElementById('searchFilter').value.trim(),
      dateFrom: document.getElementById('dateFromFilter').value,
      dateTo: document.getElementById('dateToFilter').value,
      paymentStatus: document.getElementById('paymentFilter').value,
      orderStatus: document.getElementById('orderFilter').value
    };
    Object.entries(values).forEach(function(entry){
      if(entry[1]) query.set(entry[0], entry[1]);
    });
    return query.toString();
  }

  async function loadOrders(){
    const refresh = document.getElementById('refreshButton');
    refresh.disabled = true;
    setMessage(dashboardMessage, 'Loading orders…');
    try{
      const query = filterQuery();
      const result = await request('/.netlify/functions/admin-orders' + (query ? '?' + query : ''));
      if(!Array.isArray(result.orders) || !Number.isSafeInteger(result.total) ||
         typeof result.truncated !== 'boolean'){
        throw new Error('The order service returned an invalid response. Refresh or contact support.');
      }
      renderOrders(result.orders);
      document.getElementById('truncatedMessage').hidden = !result.truncated;
      setMessage(dashboardMessage, '', true);
    } catch(error){
      setMessage(dashboardMessage, error.message);
    } finally{
      refresh.disabled = false;
    }
  }

  function addSection(title){
    const section = el('section', 'detail-section');
    section.append(el('h3', '', title));
    orderDetails.append(section);
    return section;
  }

  function addField(grid, label, value){
    const field = el('div', 'detail-field');
    field.append(el('span', '', label), document.createTextNode(value || '—'));
    grid.append(field);
  }

  function openOrder(order){
    selectedOrder = order;
    document.getElementById('dialogTitle').textContent = order.orderRef;
    orderDetails.replaceChildren();

    const overview = addSection('Order and customer');
    const overviewGrid = el('div', 'detail-grid');
    [
      ['Created', formatDate(order.createdAt)],
      ['Customer', order.customer.name],
      ['Email', order.customer.email || 'Not provided'],
      ['Contact', order.customer.contact],
      ['Phone', order.customer.phone],
      ['Delivery address', [order.customer.address, order.customer.city, order.customer.state,
        order.customer.postalCode, order.customer.country].filter(Boolean).join(', ')],
      ['Payment status', order.paymentStatus],
      ['Order status', order.orderStatus],
      ['Razorpay order ID', order.razorpayOrderId],
      ['Razorpay payment ID', order.razorpayPaymentId || 'Not available'],
      ['Payment method', order.paymentMethod || 'Not available']
    ].forEach(function(field){ addField(overviewGrid, field[0], field[1]); });
    overview.append(overviewGrid);

    const itemSection = addSection('Products');
    const itemList = el('div', 'line-items');
    order.items.forEach(function(item){
      const line = el('div', 'line-item');
      const description = el('div');
      description.append(el('strong', '', item.name));
      description.append(el('small', '', 'ID ' + item.id + ' · Qty ' + item.quantity +
        ' · Unit ' + formatMoney(item.unitPricePaise) + ' · Discount ' + item.discountPercentage +
        '% (' + formatMoney(item.discountPaise) + ' total) · Unit after discount ' +
        formatMoney(item.discountedUnitPricePaise)));
      line.append(description, el('strong', 'money', formatMoney(item.lineTotalPaise)));
      itemList.append(line);
    });
    itemSection.append(itemList);

    const totals = el('div', 'totals');
    [
      ['Subtotal', order.subtotalPaise],
      ['Discount (' + order.discountPercentage + '%)', -order.discountPaise],
      ['Final amount · ' + order.currency, order.totalPaise]
    ].forEach(function(entry, index){
      const line = el('div', 'total-row' + (index === 2 ? ' total-grand' : ''));
      line.append(el('span', '', entry[0]), el('strong', 'money', (entry[1] < 0 ? '−' : '') + formatMoney(Math.abs(entry[1]))));
      totals.append(line);
    });
    itemSection.append(totals);

    const statusSelect = document.getElementById('nextOrderStatus');
    const transitions = nextStatuses[order.orderStatus] || [];
    statusSelect.replaceChildren();
    [order.orderStatus].concat(transitions).forEach(function(status){
      const option = el('option', '', status);
      option.value = status;
      statusSelect.append(option);
    });
    statusSelect.value = transitions[0] || order.orderStatus;
    statusSelect.disabled = transitions.length === 0;
    document.getElementById('saveStatusButton').disabled = transitions.length === 0;
    setMessage(document.getElementById('dialogMessage'),
      order.paymentStatus === 'captured'
        ? 'Payment is verified as captured. Order-status changes do not issue refunds.'
        : '', order.paymentStatus === 'captured');
    dialog.showModal();
  }

  loginForm.addEventListener('submit', async function(event){
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    setMessage(loginMessage, 'Signing in…');
    try{
      const result = await request('/.netlify/functions/admin-auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'login',
          email: document.getElementById('loginEmail').value,
          password: document.getElementById('loginPassword').value
        })
      });
      document.getElementById('loginPassword').value = '';
      showDashboard(result.user);
      await loadOrders();
    } catch(error){
      setMessage(loginMessage, error.message);
    } finally{
      submit.disabled = false;
    }
  });

  document.getElementById('logoutButton').addEventListener('click', async function(){
    try{
      await request('/.netlify/functions/admin-auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'logout'})
      });
    } catch(error){
      setMessage(dashboardMessage, error.message);
    }
    showLogin('You have signed out.');
  });
  document.getElementById('filterForm').addEventListener('submit', function(event){
    event.preventDefault();
    loadOrders();
  });
  document.getElementById('refreshButton').addEventListener('click', loadOrders);
  document.getElementById('closeDialogButton').addEventListener('click', function(){ dialog.close(); });
  dialog.addEventListener('click', function(event){
    if(event.target === dialog) dialog.close();
  });
  document.getElementById('saveStatusButton').addEventListener('click', async function(){
    if(!selectedOrder) return;
    const button = this;
    button.disabled = true;
    setMessage(document.getElementById('dialogMessage'), 'Saving order status…');
    try{
      const result = await request('/.netlify/functions/admin-update-order', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          orderRef: selectedOrder.orderRef,
          orderStatus: document.getElementById('nextOrderStatus').value
        })
      });
      selectedOrder = result.order;
      setMessage(document.getElementById('dialogMessage'), 'Order status updated.', true);
      await loadOrders();
      openOrder(selectedOrder);
    } catch(error){
      setMessage(document.getElementById('dialogMessage'), error.message);
    } finally{
      button.disabled = false;
    }
  });

  checkSession();
})();
