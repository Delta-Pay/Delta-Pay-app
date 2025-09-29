let users = [];
let selectedUser = null;
let authenticatedUser = null;
let currentCharge = null;
let paymentReference = null;
let csrfToken = null;
let employeeAuth = null;

async function fetchWithTimeout(resource, options = {}, timeoutMs = 8000, retry = 1) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (retry > 0) {
      await new Promise(r => setTimeout(r, 400));
      return fetchWithTimeout(resource, options, timeoutMs, retry - 1);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function loadUsers() {
  try {
  const response = await fetchWithTimeout('/api/users/all');
    const data = await response.json();

    if (data.success) {
      users = data.users;
      console.log('Users loaded from database:', users.length);
    } else {
      console.error('Failed to load users');
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function generateRandomCharge() {
  const minAmount = 50;
  const maxAmount = 5000;
  const randomAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  const cents = Math.floor(Math.random() * 100);
  return parseFloat(`${randomAmount}.${cents.toString().padStart(2, '0')}`);
}

function generatePaymentReference() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${timestamp.slice(-6)}${random}`;
}

function navigateToSelectAccount() {
  try {
    showAccountModal();
    logSecurityEvent('ACCOUNT_MODAL_SHOWN', { timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error showing account selection:', error);
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/SelectAccount.html';
    }
  }
}

function navigateToViewPayments() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/view-payments';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/ViewPayments.html';
    }
  }
}

function _navigateToMakePayment() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/make-payment';
    } else {
      console.error("Cannot navigate - window.location not available");
    }
  } catch (error) {
    console.error('Navigation error:', error);
    try {
      if (typeof globalThis !== 'undefined' && globalThis.location) {
        globalThis.location.href = '/MakePayment.html';
      } else {
        console.error("Cannot navigate - window.location not available");
      }
    } catch (navError) {
      console.error("Fallback navigation failed:", navError);
    }
  }
}

function navigateToPayment() {
  try {
    if (typeof document === "undefined") {
      throw new Error("Document object not available");
    }

    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = "/select-account";
    } else {
      console.error("Cannot navigate - window.location not available");
    }
  } catch (error) {
    console.error("Error navigating to payment:", error);
    try {
      if (typeof globalThis !== 'undefined' && globalThis.location) {
        globalThis.location.href = "/select-account";
      } else {
        console.error("Cannot navigate - window.location not available");
      }
    } catch (navError) {
      console.error("Fallback navigation failed:", navError);
    }
  }
}

function navigateToSecurityLogs() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/security-logs';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/SecurityLogs.html';
    }
  }
}

function showAccountModal() {
  const modal = document.getElementById('accountSelectionModal');
  if (!modal) {
    throw new Error('Account selection modal not found');
  }

  updateAccountModalWithUsers();

  if (modal.classList) {
    modal.classList.add('active');
  } else {
    modal.className += ' active';
  }
}

function updateAccountModalWithUsers() {
  const accountGrid = document.querySelector('.account-grid');
  if (!accountGrid) return;

  accountGrid.innerHTML = '';

  users.forEach(user => {
    const accountCard = document.createElement('div');
    accountCard.className = 'account-card';
    accountCard.onclick = () => selectUserFromPopup(user.username);

    const letter = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    const maskedAccount = user.account_number ? `****${user.account_number.slice(-4)}` : '****0000';

    accountCard.innerHTML = `
      <div class="account-icon">${letter}</div>
      <div class="account-details">
        <h4>${user.full_name}</h4>
        <p>ID: ${user.id_number}</p>
        <p class="account-number">Account: ${maskedAccount}</p>
        <p class="account-balance">${user.currency} ${user.account_balance?.toLocaleString() || '0.00'}</p>
        <p class="account-type">${user.account_type}</p>
      </div>
    `;

    accountGrid.appendChild(accountCard);
  });
}

function closeAccountModal() {
  const modal = document.getElementById('accountSelectionModal');
  if (!modal) return;

  if (modal.classList) {
    modal.classList.remove('active');
  } else {
    modal.className = modal.className.replace(/\s*active\s*/g, '');
  }
}

function selectUserFromPopup(username) {
  try {
    const user = users.find(u => u.username === username);
    if (!user) {
      throw new Error(`User not found: ${username}`);
    }

    logSecurityEvent('USER_SELECTED_FROM_POPUP', {
      username: user.username,
      fullName: user.full_name,
      timestamp: new Date().toISOString()
    });

    sessionStorage.setItem('selectedUser', JSON.stringify(user));
    closeAccountModal();

    setTimeout(() => {
      if (typeof globalThis !== 'undefined' && globalThis.location) {
        globalThis.location.href = '/make-payment';
      }
    }, 300);

  } catch (error) {
    console.error('User selection failed:', error);
    logSecurityEvent('USER_SELECTION_ERROR', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    alert('Invalid user selection. Please try again.');
  }
}

async function initializePaymentPage() {
  try {
    await loadUsers();

    const selectedUserData = JSON.parse(sessionStorage.getItem('selectedUser') || '{}');

  if (!selectedUserData.username) {
      alert('Please select a user account first.');
      if (typeof globalThis !== 'undefined' && globalThis.location) {
        globalThis.location.href = '/select-account';
      }
      return;
    }

    selectedUser = users.find(u => u.username === selectedUserData.username);
    if (!selectedUser) {
      alert('Selected user not found. Please try again.');
      if (typeof globalThis !== 'undefined' && globalThis.location) {
        globalThis.location.href = '/select-account';
      }
      return;
    }

    showPasswordModal();

    logSecurityEvent('PAYMENT_PAGE_INITIALIZED', {
      username: selectedUserData.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error initializing payment page:', error);
    alert('Failed to initialize payment page. Please try again.');
    if (typeof globalThis !== 'undefined' && globalThis.location) {
      globalThis.location.href = '/';
    }
  }
}

function showPasswordModal() {
  const modal = document.getElementById('passwordModal');
  if (modal) {
  modal.classList.add('active');
  modal.style.display = 'flex';
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
      passwordInput.focus();
    }
  }
}

function closePasswordModal() {
  const modal = document.getElementById('passwordModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.reset();
  }
  sessionStorage.removeItem('pendingUser');
  if (
    !authenticatedUser &&
    (typeof globalThis !== 'undefined' && globalThis.location && (
      globalThis.location.pathname.includes('MakePayment.html') ||
      globalThis.location.pathname === '/make-payment'
    ))
  ) {
    globalThis.location.href = '/select-account';
  }
}

async function handlePasswordAuthentication(event) {
  event.preventDefault();

  const key = `pwdAttempts:${selectedUser?.username || 'unknown'}`;
  const attemptsRaw = sessionStorage.getItem(key);
  const attempts = attemptsRaw ? JSON.parse(attemptsRaw) : { count: 0, until: 0 };
  const now = Date.now();
  if (attempts.until && now < attempts.until) {
    alert('Too many attempts. Please wait a moment and try again.');
    return;
  }

  const password = document.getElementById('authPassword').value.trim();
  if (!password) {
    alert('Please enter your password.');
    logSecurityEvent('PASSWORD_AUTH_EMPTY_INPUT', {
      username: selectedUser?.username || 'unknown',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (password.length < 3 || password.length > 100) {
    alert('Invalid password format.');
    logSecurityEvent('PASSWORD_AUTH_INVALID_FORMAT', {
      username: selectedUser?.username || 'unknown',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const response = await fetchWithTimeout('/api/auth/authenticate-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: selectedUser.username,
        password: password
      })
    }, 8000);

    const result = await response.json();

    if (result.success) {
      sessionStorage.setItem(key, JSON.stringify({ count: 0, until: 0 }));
      authenticatedUser = result.user;
      if (result.token) {
        sessionStorage.setItem('authToken', result.token);
      }
      if (result.csrfToken) {
        csrfToken = result.csrfToken;
        sessionStorage.setItem('csrfToken', csrfToken);
      }
      
      closePasswordModal();
      initializeSecurePaymentForm();

      logSecurityEvent('USER_AUTHENTICATED_FOR_PAYMENT', {
        username: authenticatedUser.username,
        timestamp: new Date().toISOString()
      });
    } else {
  const next = { count: (attempts.count || 0) + 1, until: 0 };
  if (next.count >= 5) { next.count = 0; next.until = Date.now() + 2 * 60 * 1000; }
  sessionStorage.setItem(key, JSON.stringify(next));
      alert('Invalid password. Please try again.');
      document.getElementById('authPassword').value = '';
      document.getElementById('authPassword').focus();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    alert('Authentication failed. Please try again.');
    logSecurityEvent('PASSWORD_AUTH_SYSTEM_ERROR', {
      username: selectedUser?.username || 'unknown',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

function initializeSecurePaymentForm() {
  if (!authenticatedUser) return;

  currentCharge = generateRandomCharge();
  paymentReference = generatePaymentReference();

  updateAccountDisplay();

  autoFillPaymentDetails();

  setupFormValidation();

  logSecurityEvent('PAYMENT_FORM_INITIALIZED', {
    username: authenticatedUser.username,
    chargeAmount: currentCharge,
    reference: paymentReference,
    timestamp: new Date().toISOString()
  });
}

function updateAccountDisplay() {
  const accountHolderName = document.getElementById('accountHolderName');
  const displayAccountNumber = document.getElementById('displayAccountNumber');
  const displayBalance = document.getElementById('displayBalance');
  const accountAvatar = document.getElementById('accountAvatar');
  const userIcon = document.getElementById('userIcon');

  if (accountHolderName) accountHolderName.textContent = authenticatedUser.full_name;
  if (displayAccountNumber) {
    const maskedAccount = `••••••••••••${authenticatedUser.account_number.slice(-4)}`;
    displayAccountNumber.textContent = maskedAccount;
  }
  if (displayBalance) {
    displayBalance.textContent = `${authenticatedUser.currency} ${authenticatedUser.account_balance.toLocaleString()}`;
  }
  if (accountAvatar) {
    const letter = authenticatedUser.full_name.charAt(0).toUpperCase();
    accountAvatar.textContent = letter;
  }
  if (userIcon) {
    const letter = authenticatedUser.full_name.charAt(0).toUpperCase();
    userIcon.textContent = letter;
  }
}

function autoFillPaymentDetails() {
  const amountField = document.getElementById('amount');
  const currencyField = document.getElementById('currency');
  const serviceDescription = document.getElementById('serviceDescription');
  const paymentReferenceField = document.getElementById('paymentReference');
  const buttonAmount = document.getElementById('buttonAmount');

  if (amountField) amountField.textContent = `${authenticatedUser.currency} ${currentCharge.toFixed(2)}`;
  if (currencyField) currencyField.textContent = authenticatedUser.currency;
  if (serviceDescription) serviceDescription.textContent = 'International Payment Processing Fee';
  if (paymentReferenceField) paymentReferenceField.textContent = paymentReference;
  if (buttonAmount) buttonAmount.textContent = `${authenticatedUser.currency} ${currentCharge.toFixed(2)}`;

  const cardNumber = document.getElementById('cardNumber');
  const expiryDate = document.getElementById('expiryDate');
  const cardholderName = document.getElementById('cardholderName');
  const billingAddress = document.getElementById('billingAddress');

  if (cardNumber && authenticatedUser.card_number) {
    const maskedCardNumber = `•••• •••• •••• ${authenticatedUser.card_number.slice(-4)}`;
    cardNumber.textContent = maskedCardNumber;
  }
  if (expiryDate && authenticatedUser.card_expiry) {
    expiryDate.textContent = authenticatedUser.card_expiry;
  }
  if (cardholderName && authenticatedUser.card_holder_name) {
    cardholderName.textContent = authenticatedUser.card_holder_name;
  }
  if (billingAddress) {
    const address = `${authenticatedUser.address_line_1}\n${authenticatedUser.address_line_2 ? authenticatedUser.address_line_2 + '\n' : ''}${authenticatedUser.city}, ${authenticatedUser.state_province} ${authenticatedUser.postal_code}\n${authenticatedUser.country}`;
    billingAddress.textContent = address;
  }
}

function setupFormValidation() {
  const cvvInput = document.getElementById('cvv');
  const termsCheckbox = document.getElementById('acceptTerms');
  const submitButton = document.getElementById('processPaymentBtn');

  function validateForm() {
    const cvvValid = cvvInput && cvvInput.value.length === 3 && /^\d{3}$/.test(cvvInput.value);
    const termsAccepted = termsCheckbox && termsCheckbox.checked;

    if (cvvInput && cvvInput.value && !cvvValid) {
      logSecurityEvent('CVV_VALIDATION_FAILED', {
        username: authenticatedUser?.username || 'unknown',
        reason: 'Invalid CVV format',
        timestamp: new Date().toISOString()
      });
    }

    if (submitButton) {
      submitButton.disabled = !(cvvValid && termsAccepted);

      if (cvvValid && termsAccepted) {
        submitButton.classList.add('ready');
      } else {
        submitButton.classList.remove('ready');
      }
    }
  }

  if (cvvInput) {
    cvvInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
      validateForm();
    });
  }

  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', validateForm);
  }

  validateForm();
}

function _populateUsersOnPaymentPage() {
  const usersList = document.getElementById('usersList');
  if (!usersList || users.length === 0) return;

  usersList.innerHTML = '';

  users.forEach(user => {
    const userCard = document.createElement('div');
    userCard.className = 'user-card';
    userCard.onclick = () => selectUserOnPaymentPage(user);

    const letter = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    const maskedAccount = user.account_number ? `****${user.account_number.slice(-4)}` : '****0000';

    userCard.innerHTML = `
      <div class="user-card-header">
        <div class="user-avatar">${letter}</div>
        <div class="user-card-info">
          <h4>${user.full_name}</h4>
          <p class="user-location">${user.city}, ${user.country}</p>
        </div>
      </div>
      <div class="user-card-details">
        <p>ID: ${user.id_number}</p>
        <p>Account: ${maskedAccount}</p>
        <p>Balance: ${user.currency} ${user.account_balance?.toLocaleString() || '0.00'}</p>
        <p>Type: ${user.account_type}</p>
      </div>
    `;

    usersList.appendChild(userCard);
  });
}

function selectUserOnPaymentPage(user) {
  document.querySelectorAll('.user-card').forEach(card => {
    card.classList.remove('selected');
  });

  event.currentTarget.classList.add('selected');

  sessionStorage.setItem('selectedUser', JSON.stringify(user));

  const userIcon = document.getElementById('userIcon');
  const usernameField = document.getElementById('username');
  const accountNumberField = document.getElementById('accountNumber');

  if (userIcon) {
    const letter = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    userIcon.textContent = letter;
  }

  if (usernameField) {
    usernameField.value = user.username;
  }

  if (accountNumberField) {
    accountNumberField.value = user.account_number;
  }

  logSecurityEvent('USER_SELECTED_ON_PAYMENT_PAGE', {
    username: user.username,
    fullName: user.full_name,
    timestamp: new Date().toISOString()
  });
}

async function handlePaymentSubmit(event) {
  try {
    event.preventDefault();

    if (!authenticatedUser || !currentCharge) {
      alert('Authentication required. Please refresh and try again.');
      return;
    }

    const cvv = document.getElementById('cvv').value;
    const termsAccepted = document.getElementById('acceptTerms').checked;

    if (!cvv || cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
      alert('Please enter a valid 3-digit CVV.');
      logSecurityEvent('PAYMENT_INVALID_CVV', {
        username: authenticatedUser.username,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!termsAccepted) {
      alert('Please accept the Terms of Service to continue.');
      logSecurityEvent('PAYMENT_TERMS_NOT_ACCEPTED', {
        username: authenticatedUser.username,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const submitButton = document.getElementById('processPaymentBtn');
    if (submitButton) {
      submitButton.disabled = true;
  const amountText = `${authenticatedUser?.currency || ''} ${currentCharge?.toFixed(2) || '0.00'}`;
  submitButton.innerHTML = '<div class="button-content"><span class="button-text">Processing...</span><span class="button-amount">' + amountText + '</span></div><div class="button-security"><span class="loading-spinner"></span></div>';
    }

    logSecurityEvent('PAYMENT_SUBMISSION_ATTEMPT', {
      username: authenticatedUser.username,
      amount: currentCharge,
      currency: authenticatedUser.currency,
      reference: paymentReference,
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const paymentSuccess = await processSecurePayment({
      userId: authenticatedUser.id,
      amount: currentCharge,
      currency: authenticatedUser.currency,
      reference: paymentReference,
      cvv: cvv
    });

    if (paymentSuccess) {
      showSuccessModal();
      logSecurityEvent('PAYMENT_SUCCESS', {
        username: authenticatedUser.username,
        amount: currentCharge,
        currency: authenticatedUser.currency,
        reference: paymentReference,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Payment processing failed');
    }

  } catch (error) {
    console.error('Payment processing failed:', error);
    logSecurityEvent('PAYMENT_ERROR', {
      username: authenticatedUser?.username || 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    alert('Payment processing failed. Please try again.');

    const submitButton = document.getElementById('processPaymentBtn');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '<div class="button-content"><span class="button-text">Secure Payment</span><span class="button-amount">' + `${authenticatedUser?.currency || ''} ${currentCharge?.toFixed(2) || '0.00'}` + '</span></div><div class="button-security"><svg class="security-badge-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/></svg></div>';
    }
  }
}

async function processSecurePayment(paymentData) {
  try {
    const authToken = sessionStorage.getItem('authToken');
    const storedCsrf = sessionStorage.getItem('csrfToken');
    if (!csrfToken && storedCsrf) csrfToken = storedCsrf;
    if (authToken && !csrfToken) {
      try {
        const csrfRes = await fetch('/api/auth/csrf-token', { headers: { Authorization: `Bearer ${authToken}` } });
        if (csrfRes.ok) {
          const csrfJson = await csrfRes.json();
          if (csrfJson.success && csrfJson.csrfToken) {
            csrfToken = csrfJson.csrfToken;
            sessionStorage.setItem('csrfToken', csrfToken);
          }
        }
  } catch (_) {;}
    }
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const RECIPIENT_ACCOUNT = (globalThis.DELTA_CONFIG && globalThis.DELTA_CONFIG.recipientAccount) || 'DELTAPAYPROC01';
    const body = {
      amount: Number(paymentData.amount).toFixed(2),
      currency: String(paymentData.currency || '').toUpperCase(),
      provider: 'WIRE',
      recipientAccount: RECIPIENT_ACCOUNT,
      notes: `Payment processing fee - Reference: ${paymentData.reference}`
    };

    if (authToken && !csrfToken) {
      try {
        const csrfRes = await fetchWithTimeout('/api/auth/csrf-token', { headers: { Authorization: `Bearer ${authToken}` } }, 6000);
        if (csrfRes.ok) {
          const csrfJson = await csrfRes.json();
          if (csrfJson.success && csrfJson.csrfToken) {
            csrfToken = csrfJson.csrfToken;
            sessionStorage.setItem('csrfToken', csrfToken);
            headers['X-CSRF-Token'] = csrfToken;
          }
        }
  } catch (_) {;}
    }

    if (authToken && !csrfToken) {
      showToast && showToast('Secure token missing. Please retry or re-authenticate.', 'error');
      return false;
    }

    const response = await fetchWithTimeout('/api/user/payments', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }, 10000);

    let result = await response.json();
    if (response.status === 401) {
      showToast && showToast('Session expired or not authorized. Please re-authenticate.', 'error');
      return false;
    }
    if (response.status === 403 && authToken) {
      try {
        const csrfRes = await fetchWithTimeout('/api/auth/csrf-token', { headers: { Authorization: `Bearer ${authToken}` } }, 6000);
        const csrfJson = await csrfRes.json();
        if (csrfJson.success && csrfJson.csrfToken) {
          csrfToken = csrfJson.csrfToken;
          sessionStorage.setItem('csrfToken', csrfToken);
          headers['X-CSRF-Token'] = csrfToken;
          const retryRes = await fetchWithTimeout('/api/user/payments', {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          }, 10000);
          result = await retryRes.json();
          if (!retryRes.ok) {
            showToast && showToast(result.message || 'Payment request rejected', 'error');
            return false;
          }
          return !!result.success;
        }
  } catch (_) {;}
      showToast && showToast(result.message || 'CSRF validation failed', 'error');
      return false;
    }
    if (!result.success) {
      showToast && showToast(result.message || 'Payment request rejected', 'error');
    }
    return !!result.success;
  } catch (error) {
    console.error('Payment storage failed:', error);
    logSecurityEvent('PAYMENT_STORAGE_ERROR', {
      username: authenticatedUser?.username || 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

function showSuccessModal() {
  const modal = document.getElementById('successModal');
  const successAmount = document.getElementById('successAmount');
  const successReference = document.getElementById('successReference');

  if (successAmount && currentCharge && authenticatedUser) {
    successAmount.textContent = `${authenticatedUser.currency} ${currentCharge.toFixed(2)}`;
  }

  if (successReference && paymentReference) {
    successReference.textContent = paymentReference;
  }

  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';

    setTimeout(() => {
      const checkmarkCircle = modal.querySelector('.checkmark-circle');
      if (checkmarkCircle) {
        checkmarkCircle.classList.add('animate');
      }
    }, 100);

    setTimeout(() => {
      if (modal.classList.contains('active')) {
        closeSuccessModal();
      }
    }, 5000);
  }
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
  modal.classList.remove('active');
  modal.style.display = 'none';
  }

  sessionStorage.removeItem('selectedUser');
  sessionStorage.removeItem('authenticatedUser');

  logSecurityEvent('USER_RETURNED_TO_DASHBOARD', {
    username: authenticatedUser?.username || 'unknown',
    timestamp: new Date().toISOString()
  });

  if (typeof globalThis !== 'undefined' && globalThis.location) {
    globalThis.location.href = '/';
  }
}

async function logSecurityEvent(eventType, details) {
  try {
    const logData = {
      eventType,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent || 'unknown',
  url: (typeof globalThis !== 'undefined' && globalThis.location ? globalThis.location.href : 'unknown')
    };

    await fetch('/api/security/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadUsers();

    logSecurityEvent('PAGE_LOAD', {
      page: (typeof globalThis !== 'undefined' && globalThis.location ? globalThis.location.pathname : 'unknown'),
      referrer: document.referrer || ''
    });

    const paymentOption = document.getElementById('payment-option');
    const backendOption = document.getElementById('backend-option');

  if (paymentOption) paymentOption.addEventListener('click', navigateToSelectAccount);

  if (backendOption) backendOption.addEventListener('click', navigateToViewPayments);

  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.addEventListener('click', () => { if (globalThis.location) globalThis.location.href = '/'; });

  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closePasswordModal);

  const closeSuccessBtn = document.getElementById('closeSuccessBtn');
  if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeSuccessModal);

  const closeAccountModalBtn = document.getElementById('closeAccountModalBtn');
  if (closeAccountModalBtn) closeAccountModalBtn.addEventListener('click', closeAccountModal);

  const goToLogsBtn = document.getElementById('goToLogsBtn');
  if (goToLogsBtn) goToLogsBtn.addEventListener('click', navigateToSecurityLogs);

  const employeeLoginClose = document.getElementById('employeeLoginClose');
  if (employeeLoginClose) employeeLoginClose.addEventListener('click', closeEmployeeLoginModal);

  const denyClose = document.getElementById('denyClose');
  if (denyClose) denyClose.addEventListener('click', closeDenyModal);

  const goToPaymentBtn = document.getElementById('goToPaymentBtn');
  if (goToPaymentBtn) goToPaymentBtn.addEventListener('click', navigateToPayment);

  const passwordCancelBtn = document.getElementById('passwordCancelBtn');
  if (passwordCancelBtn) passwordCancelBtn.addEventListener('click', closePasswordModal);

  if (typeof globalThis !== 'undefined' && globalThis.location && (globalThis.location.pathname.includes('MakePayment.html') || globalThis.location.pathname === '/make-payment')) {
      initializePaymentPage();
    }

    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
      paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', handlePasswordAuthentication);
    }

  if (typeof globalThis !== 'undefined' && globalThis.location && (globalThis.location.pathname.includes('SelectAccount.html') || globalThis.location.pathname === '/select-account')) {
      initializeSelectAccountPage();
    }

    if (typeof globalThis !== 'undefined' && globalThis.location && (globalThis.location.pathname.includes('ViewPayments.html') || globalThis.location.pathname === '/view-payments')) {
      initializeAdminTransactionsPage();
    }

  } catch (error) {
    console.error('Error during initialization:', error);
  }
});

function initializeSelectAccountPage() {
  const accountsGrid = document.getElementById('accountsGrid');
  if (!accountsGrid || users.length === 0) return;

  accountsGrid.innerHTML = '';

  users.forEach(user => {
    const accountCard = document.createElement('div');
    accountCard.className = 'account-card';
    accountCard.onclick = () => selectUser(user.username);

    const letter = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    const maskedAccount = user.account_number ? `****${user.account_number.slice(-4)}` : '****0000';

    accountCard.innerHTML = `
      <div class="account-icon">${letter}</div>
      <div class="account-details">
        <h3>${user.full_name}</h3>
        <p>ID: ${user.id_number}</p>
        <p class="account-balance">Account: ${maskedAccount}</p>
        <p class="account-type">${user.account_type} - ${user.currency} ${user.account_balance?.toLocaleString() || '0.00'}</p>
      </div>
      <div class="account-arrow">→</div>
    `;

    accountsGrid.appendChild(accountCard);
  });
}

function selectUser(username) {
  const user = users.find(u => u.username === username);
  if (!user) {
    console.error('User not found:', username);
    return;
  }

  const selectedUserName = document.getElementById('selectedUserName');
  if (selectedUserName) {
    selectedUserName.textContent = user.full_name;
  }

  const passwordModal = document.getElementById('passwordModal');
  if (passwordModal) {
    passwordModal.style.display = 'flex';
  }

  sessionStorage.setItem('pendingUser', JSON.stringify(user));

  logSecurityEvent('USER_SELECTION_ATTEMPT', {
    username: user.username,
    fullName: user.full_name,
    timestamp: new Date().toISOString()
  });
}

 
async function initializeAdminTransactionsPage() {
  try {
  restoreEmployeeSession();
  bindAdminControls();
  updateAdminAuthStatus();
  await loadAndRenderTransactions();
  } catch (error) {
    console.error('Admin init failed:', error);
  }
}

function bindAdminControls() {
  const refreshBtn = document.getElementById('refreshTransactionsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadAndRenderTransactions);

  const loginForm = document.getElementById('employeeLoginForm');
  if (loginForm) loginForm.addEventListener('submit', handleEmployeeLogin);

  const denyForm = document.getElementById('denyForm');
  if (denyForm) denyForm.addEventListener('submit', submitDenyReason);
}

function updateAdminAuthStatus() {
  const statusEl = document.getElementById('adminAuthStatus');
  if (statusEl) statusEl.textContent = employeeAuth ? `Authenticated as ${employeeAuth.employee?.username}` : 'Not authenticated';
  const icon = document.getElementById('employeeIcon');
  if (icon) icon.textContent = employeeAuth?.employee?.fullName?.charAt(0)?.toUpperCase() || 'E';
}

function showEmployeeLoginModal() {
  const modal = document.getElementById('employeeLoginModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeEmployeeLoginModal() {
  const modal = document.getElementById('employeeLoginModal');
  if (modal) modal.style.display = 'none';
}

async function handleEmployeeLogin(e) {
  e.preventDefault();
  const username = document.getElementById('employeeUsername').value.trim();
  const password = document.getElementById('employeePassword').value.trim();
  if (!username || !password) return;
  try {
    const res = await fetch('/api/auth/employee-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) {
      alert('Invalid employee credentials');
      return;
    }
    const token = data.token;
    let csrf = null;
    try {
      const csrfRes = await fetch('/api/auth/csrf-token', { headers: { Authorization: `Bearer ${token}` } });
      const csrfData = await csrfRes.json();
    if (csrfData.success) csrf = csrfData.csrfToken;
  } catch (_) {;}
    employeeAuth = { token, csrfToken: csrf, employee: data.employee };
    sessionStorage.setItem('employeeAuth', JSON.stringify(employeeAuth));
    updateAdminAuthStatus();
    closeEmployeeLoginModal();
    await loadAndRenderTransactions();
  } catch (error) {
    console.error('Employee login failed:', error);
    alert('Login error');
  }
}

function restoreEmployeeSession() {
  const raw = sessionStorage.getItem('employeeAuth');
  if (raw) {
    try { employeeAuth = JSON.parse(raw); } catch (_) { employeeAuth = null; }
  }
}

async function loadAndRenderTransactions() {
  try {
    const headers = {};
    if (employeeAuth?.token) headers['Authorization'] = `Bearer ${employeeAuth.token}`;
  const res = await fetchWithTimeout('/api/admin/transactions', { headers }, 10000);
    const data = await res.json();
    if (!data.success) throw new Error('Failed to load transactions');
    renderTransactions(data.transactions || []);
  } catch (error) {
    console.error('Load transactions failed:', error);
  }
}

function renderTransactions(rows) {
  const tbody = document.getElementById('transactionsBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 10;
    td.textContent = 'No transactions found';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  rows.forEach(tx => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(101,90,124,0.1)';
    const amountFmt = `${tx.currency} ${Number(tx.amount).toFixed(2)}`;
    const dateFmt = new Date(tx.createdAt).toLocaleString();
    tr.innerHTML = `
      <td>${tx.id}</td>
      <td>${dateFmt}</td>
      <td><div style="display:flex;flex-direction:column"><strong>${tx.userFullName}</strong><span style="opacity:.8;font-size:.85rem">@${tx.userUsername}</span></div></td>
      <td>${amountFmt}</td>
      <td>${tx.provider}</td>
      <td>${tx.recipientAccount}</td>
      <td>${tx.status}</td>
      <td>${tx.processedByFullName || '-'}</td>
      <td>
        <div style="display:flex;gap:.5rem;">
          <button class="option-button" style="padding:.4rem .6rem;min-width:90px;${tx.status!=='pending'?'opacity:.5;pointer-events:none;':''}" data-action="approve" data-id="${tx.id}">Approve</button>
          <button class="option-button backend-option" style="padding:.4rem .6rem;min-width:90px;${tx.status!=='pending'?'opacity:.5;pointer-events:none;':''}" data-action="deny" data-id="${tx.id}">Deny</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', onTransactionActionClick);
  });
}

function onTransactionActionClick(e) {
  const btn = e.currentTarget;
  const id = Number(btn.getAttribute('data-id'));
  const action = btn.getAttribute('data-action');
  if (action === 'approve') approveTransactionAdmin(id);
  else if (action === 'deny') openDenyModal(id);
}

function openDenyModal(id) {
  const modal = document.getElementById('denyModal');
  const input = document.getElementById('denyTransactionId');
  if (input) input.value = String(id);
  if (modal) modal.style.display = 'flex';
}

function closeDenyModal() {
  const modal = document.getElementById('denyModal');
  if (modal) modal.style.display = 'none';
}

async function submitDenyReason(e) {
  e.preventDefault();
  const id = Number(document.getElementById('denyTransactionId').value);
  const reason = document.getElementById('denyReason').value.trim();
  if (!reason) return;
  await denyTransactionAdmin(id, reason);
  closeDenyModal();
}

function showToast(message, type = 'info', timeout = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const msg = document.createElement('div');
  msg.className = 'toast-message';
  msg.textContent = message;
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.innerHTML = '×';
  close.addEventListener('click', () => container.removeChild(toast));
  toast.appendChild(msg);
  toast.appendChild(close);
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement === container) container.removeChild(toast);
  }, timeout);
}

async function approveTransactionAdmin(id) {
  try {
    if (!employeeAuth?.token) return showEmployeeLoginModal();
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${employeeAuth.token}` };
    if (!employeeAuth.csrfToken) {
      try {
        const csrfRes = await fetchWithTimeout('/api/auth/csrf-token', { headers: { Authorization: `Bearer ${employeeAuth.token}` } }, 6000);
        const csrfData = await csrfRes.json();
        if (csrfData.success) employeeAuth.csrfToken = csrfData.csrfToken;
        sessionStorage.setItem('employeeAuth', JSON.stringify(employeeAuth));
  } catch (_) {;}
    }
    if (!employeeAuth.csrfToken) {
      showToast && showToast('Secure token missing. Please retry login.', 'error');
      return;
    }
    if (employeeAuth.csrfToken) headers['X-CSRF-Token'] = employeeAuth.csrfToken;
    const res = await fetchWithTimeout(`/api/admin/transactions/${id}/approve`, { method: 'PUT', headers }, 10000);
    const data = await res.json();
    if (!data.success) throw new Error('Approve failed');
    showToast('Transaction approved', 'success');
    await loadAndRenderTransactions();
  } catch (error) {
    console.error('Approve error:', error);
    showToast('Failed to approve', 'error');
  }
}

async function denyTransactionAdmin(id, reason) {
  try {
    if (!employeeAuth?.token) return showEmployeeLoginModal();
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${employeeAuth.token}` };
    if (!employeeAuth.csrfToken) {
      try {
        const csrfRes = await fetchWithTimeout('/api/auth/csrf-token', { headers: { Authorization: `Bearer ${employeeAuth.token}` } }, 6000);
        const csrfData = await csrfRes.json();
        if (csrfData.success) employeeAuth.csrfToken = csrfData.csrfToken;
        sessionStorage.setItem('employeeAuth', JSON.stringify(employeeAuth));
  } catch (_) {;}
    }
    if (!employeeAuth.csrfToken) {
      showToast && showToast('Secure token missing. Please retry login.', 'error');
      return;
    }
    if (employeeAuth.csrfToken) headers['X-CSRF-Token'] = employeeAuth.csrfToken;
    const res = await fetchWithTimeout(`/api/admin/transactions/${id}/deny`, { method: 'PUT', headers, body: JSON.stringify({ reason }) }, 10000);
    const data = await res.json();
    if (!data.success) throw new Error('Deny failed');
    showToast('Transaction denied', 'success');
    await loadAndRenderTransactions();
  } catch (error) {
    console.error('Deny error:', error);
    showToast('Failed to deny', 'error');
  }
}