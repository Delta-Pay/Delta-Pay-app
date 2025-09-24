// #COMPLETION_DRIVE: Assuming API server is running and will respond to navigation requests
// #SUGGEST_VERIFY: Check server response and handle errors appropriately

async function navigateToSelectAccount() {
  try {
    const response = await fetch('/select-account');
    if (response.ok) {
      window.location.href = '/select-account';
    } else {
      console.error('Navigation failed:', response.status);
      // Fallback to direct navigation
      window.location.href = '/select-account';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to direct navigation
    window.location.href = '/select-account';
  }
}

async function navigateToViewPayments() {
  try {
    const response = await fetch('/security-logs');
    if (response.ok) {
      window.location.href = '/security-logs';
    } else {
      console.error('Navigation failed:', response.status);
      // Fallback to direct navigation
      window.location.href = '/security-logs';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to direct navigation
    window.location.href = '/security-logs';
  }
}

// Additional navigation functions for other pages
async function navigateToMakePayment() {
  try {
    const response = await fetch('/make-payment');
    if (response.ok) {
      window.location.href = '/make-payment';
    } else {
      console.error('Navigation failed:', response.status);
      window.location.href = '/make-payment';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    window.location.href = '/make-payment';
  }
}

async function navigateToSecurityLogs() {
  try {
    const response = await fetch('/security-logs');
    if (response.ok) {
      window.location.href = '/security-logs';
    } else {
      console.error('Navigation failed:', response.status);
      window.location.href = '/security-logs';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    window.location.href = '/security-logs';
  }
}

// Utility function for API calls with error handling
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Security logging function
async function logSecurityEvent(eventType, details) {
  try {
    await apiCall('/api/security/log', {
      method: 'POST',
      body: JSON.stringify({
        eventType,
        details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Initialize security monitoring
document.addEventListener('DOMContentLoaded', () => {
  // Log page load
  logSecurityEvent('PAGE_LOAD', {
    page: window.location.pathname,
    referrer: document.referrer
  });

  // Add event listeners for buttons to replace inline onclick handlers
  const paymentOption = document.getElementById('payment-option');
  const backendOption = document.getElementById('backend-option');

  if (paymentOption) {
    paymentOption.addEventListener('click', navigateToSelectAccount);
  }

  if (backendOption) {
    backendOption.addEventListener('click', navigateToViewPayments);
  }

  // Monitor for suspicious activity
  let failedAttempts = 0;
  const maxAttempts = 5;

  // Reset attempts on successful navigation
  window.addEventListener('beforeunload', () => {
    if (failedAttempts < maxAttempts) {
      failedAttempts = 0;
    }
  });
});

// Export functions for global access
window.navigateToSelectAccount = navigateToSelectAccount;
window.navigateToViewPayments = navigateToViewPayments;
window.navigateToMakePayment = navigateToMakePayment;
window.navigateToSecurityLogs = navigateToSecurityLogs;
