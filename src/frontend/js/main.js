// #COMPLETION_DRIVE: Assuming navigation will be handled by URL routing or separate pages // #SUGGEST_VERIFY: Implement proper routing system and confirm navigation approach

function navigateToPayment() {
  // #COMPLETION_DRIVE: Assuming payment page exists at /payment route // #SUGGEST_VERIFY: Create payment page and confirm routing
  window.location.href = '/payment';
}

function navigateToBackend() {
  // #COMPLETION_DRIVE: Assuming backend/admin page exists at /admin route // #SUGGEST_VERIFY: Create admin page and confirm routing
  window.location.href = '/admin';
}
document.addEventListener('DOMContentLoaded', function() {
  const optionButtons = document.querySelectorAll('.option-button');

  optionButtons.forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });

    button.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });

    button.addEventListener('mousedown', function() {
      this.style.transform = 'translateY(-4px) scale(0.98)';
    });

    button.addEventListener('mouseup', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
  });
});