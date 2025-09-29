let users = [];
let selectedUser = null;

async function loadUsers() {
  try {
    const response = await fetch('/api/users/all');
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

function navigateToSelectAccount() {
  try {
    showAccountModal();
    logSecurityEvent('ACCOUNT_MODAL_SHOWN', { timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error showing account selection:', error);
    window.location.href = '/SelectAccount.html';
  }
}

function navigateToViewPayments() {
  try {
    window.location.href = '/security-logs';
  } catch (error) {
    console.error('Navigation error:', error);
    window.location.href = '/SecurityLogs.html';
  }
}

function navigateToMakePayment() {
  try {
    window.location.href = '/make-payment';
  } catch (error) {
    console.error('Navigation error:', error);
    window.location.href = '/MakePayment.html';
  }
}

function navigateToSecurityLogs() {
  try {
    window.location.href = '/security-logs';
  } catch (error) {
    console.error('Navigation error:', error);
    window.location.href = '/SecurityLogs.html';
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

    accountCard.innerHTML = `
      <div class="account-icon">${user.letter}</div>
      <div class="account-details">
        <h4>${user.full_name}</h4>
        <p>ID: ${user.id_number}</p>
        <p class="account-number">Account: ****${user.account_number}</p>
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
      window.location.href = '/make-payment';
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

function initializePaymentPage() {
  try {
    const selectedUserData = JSON.parse(sessionStorage.getItem('selectedUser') || '{}');

    if (!selectedUserData.username) {
      throw new Error('No user selected');
    }

    const userIcon = document.getElementById('userIcon');
    if (userIcon) {
      userIcon.textContent = selectedUserData.letter || 'U';
    }

    logSecurityEvent('PAYMENT_PAGE_INITIALIZED', {
      username: selectedUserData.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error initializing payment page:', error);
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  }
}

async function handlePaymentSubmit(event) {
  try {
    event.preventDefault();

    const formData = new FormData(event.target);
    const selectedUserData = JSON.parse(sessionStorage.getItem('selectedUser') || '{}');

    if (!validatePaymentForm(formData)) {
      return;
    }

    const paymentData = {
      amount: formData.get('amount'),
      currency: formData.get('currency'),
      cardNumber: formData.get('cardNumber'),
      expiryDate: formData.get('expiryDate'),
      cvv: formData.get('cvv'),
      cardholderName: formData.get('cardholderName'),
      swiftCode: formData.get('swiftCode'),
      recipientAccount: formData.get('recipientAccount')
    };

    logSecurityEvent('PAYMENT_ATTEMPT', {
      amount: paymentData.amount,
      currency: paymentData.currency,
      username: selectedUserData.username
    });

    const isValid = await processPayment(paymentData);

    if (isValid) {
      setTimeout(() => {
        showSuccessModal();
        logSecurityEvent('PAYMENT_SUCCESS', {
          amount: paymentData.amount,
          currency: paymentData.currency
        });
      }, 1500);
    } else {
      throw new Error('Payment validation failed');
    }

  } catch (error) {
    console.error('Payment processing failed:', error);
    logSecurityEvent('PAYMENT_ERROR', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    alert('Payment processing failed. Please try again.');
  }
}

function validatePaymentForm(formData) {
  try {
    const amount = parseFloat(formData.get('amount'));
    const cardNumber = formData.get('cardNumber').replace(/\s/g, '');
    const cvv = formData.get('cvv');

    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
      alert('Please enter a valid amount between 0.01 and 1,000,000');
      return false;
    }

    if (!/^\d{16}$/.test(cardNumber)) {
      alert('Please enter a valid 16-digit card number');
      return false;
    }

    if (!/^\d{3}$/.test(cvv)) {
      alert('Please enter a valid 3-digit CVV');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Form validation error:', error);
    alert('Form validation failed. Please check your input and try again.');
    return false;
  }
}

async function processPayment(paymentData) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const amount = parseFloat(paymentData.amount);
      const isApproved = amount <= 10000;
      resolve(isApproved);
    }, 1000);
  });
}

function showSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    if (modal.classList) {
      modal.classList.add('active');
    } else {
      modal.className += ' active';
    }
  }
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    if (modal.classList) {
      modal.classList.remove('active');
    } else {
      modal.className = modal.className.replace(/\s*active\s*/g, '');
    }
    window.location.href = '/';
  }
}

async function logSecurityEvent(eventType, details) {
  try {
    const logData = {
      eventType,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent || 'unknown',
      url: window.location.href || 'unknown'
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
      page: window.location.pathname,
      referrer: document.referrer || ''
    });

    const paymentOption = document.getElementById('payment-option');
    const backendOption = document.getElementById('backend-option');

    if (paymentOption) {
      paymentOption.addEventListener('click', navigateToSelectAccount);
    }

    if (backendOption) {
      backendOption.addEventListener('click', navigateToViewPayments);
    }

    if (window.location.pathname.includes('MakePayment.html') || window.location.pathname === '/make-payment') {
      initializePaymentPage();
    }

    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
      paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

  } catch (error) {
    console.error('Error during initialization:', error);
  }
});

if (typeof window !== 'undefined') {
  window.navigateToSelectAccount = navigateToSelectAccount;
  window.navigateToViewPayments = navigateToViewPayments;
  window.navigateToMakePayment = navigateToMakePayment;
  window.navigateToSecurityLogs = navigateToSecurityLogs;
  window.closeAccountModal = closeAccountModal;
  window.selectUserFromPopup = selectUserFromPopup;
  window.initializePaymentPage = initializePaymentPage;
  window.closeSuccessModal = closeSuccessModal;
}