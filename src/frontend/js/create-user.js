// Form validation and submission handling for Create User page
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createUserForm');
    const backBtn = document.getElementById('backToAdminBtn');

    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            globalThis.location.href = '/view-payments';
        });
    }

    if (form) {
        // Real-time password match validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');

        confirmPassword.addEventListener('input', () => {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });

        // Format card expiry as user types (MM/YY)
        const cardExpiry = document.getElementById('cardExpiry');
        cardExpiry.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });

        // Format phone number as user types (+27-12-345-6789)
        const phoneNumber = document.getElementById('phoneNumber');
        phoneNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d+]/g, '');
            if (value.length > 0 && !value.startsWith('+')) {
                value = '+' + value;
            }
            
            if (value.length > 3) {
                const countryCode = value.slice(0, 3);
                const rest = value.slice(3).replace(/\D/g, '');
                if (rest.length <= 2) {
                    value = countryCode + (rest ? '-' + rest : '');
                } else if (rest.length <= 5) {
                    value = countryCode + '-' + rest.slice(0, 2) + (rest.length > 2 ? '-' + rest.slice(2) : '');
                } else {
                    value = countryCode + '-' + rest.slice(0, 2) + '-' + rest.slice(2, 5) + (rest.length > 5 ? '-' + rest.slice(5, 9) : '');
                }
            }
            e.target.value = value;
        });

        // Format ID number - only digits, max 13
        const idNumber = document.getElementById('idNumber');
        idNumber.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13);
        });

        // Format account number - only digits, max 20
        const accountNumber = document.getElementById('accountNumber');
        accountNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '').slice(0, 20);
            if (value.length > 4) {
                value = value.match(/.{1,4}/g).join(' ');
            }
            e.target.value = value;
        });

        // Format card number - only digits with spaces, max 16
        const cardNumber = document.getElementById('cardNumber');
        cardNumber.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '').slice(0, 16);
            if (value.length > 4) {
                value = value.match(/.{1,4}/g).join(' ');
            }
            e.target.value = value;
        });

        // Format postal code - alphanumeric only
        const postalCode = document.getElementById('postalCode');
        postalCode.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        });

        // Auto-fill cardholder name from full name
        const fullName = document.getElementById('fullName');
        const cardHolderName = document.getElementById('cardHolderName');
        fullName.addEventListener('blur', () => {
            if (!cardHolderName.value && fullName.value) {
                cardHolderName.value = fullName.value;
            }
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate passwords match
            if (password.value !== confirmPassword.value) {
                console.error('Password mismatch');
                showToast('Passwords do not match', 'error');
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="button-content"><span class="button-text">Creating Account...</span></div>';

            try {
                const formData = {
                    fullName: document.getElementById('fullName').value.trim(),
                    idNumber: document.getElementById('idNumber').value.replace(/\D/g, ''),
                    accountNumber: document.getElementById('accountNumber').value.replace(/\s/g, ''),
                    username: document.getElementById('username').value.trim(),
                    password: document.getElementById('password').value,
                    email: document.getElementById('email').value.trim(),
                    phoneNumber: document.getElementById('phoneNumber').value.trim(),
                    dateOfBirth: document.getElementById('dateOfBirth').value,
                    nationality: document.getElementById('nationality').value.trim(),
                    addressLine1: document.getElementById('addressLine1').value.trim(),
                    addressLine2: document.getElementById('addressLine2').value.trim(),
                    city: document.getElementById('city').value.trim(),
                    stateProvince: document.getElementById('stateProvince').value.trim(),
                    postalCode: document.getElementById('postalCode').value.trim(),
                    country: document.getElementById('country').value.trim(),
                    accountBalance: parseFloat(document.getElementById('accountBalance').value) || 0,
                    currency: document.getElementById('currency').value,
                    accountType: document.getElementById('accountType').value,
                    preferredLanguage: document.getElementById('preferredLanguage').value.trim() || 'English',
                    occupation: document.getElementById('occupation').value.trim() || 'Unspecified',
                    annualIncome: parseFloat(document.getElementById('annualIncome').value) || 0,
                    cardNumber: document.getElementById('cardNumber').value.replace(/\s/g, ''),
                    cardExpiry: document.getElementById('cardExpiry').value.trim(),
                    cardHolderName: document.getElementById('cardHolderName').value.trim()
                };

                console.log('Submitting user creation request:', {
                    username: formData.username,
                    fullName: formData.fullName,
                    email: formData.email
                });

                const response = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                console.log('Response status:', response.status);

                const result = await response.json();
                console.log('Response data:', result);

                if (result.success) {
                    console.log('User created successfully with ID:', result.userId);
                    showToast('User account created successfully!', 'success', 3000);
                    setTimeout(() => {
                        window.location.href = '/view-payments';
                    }, 2000);
                } else {
                    console.error('User creation failed:', result.message);
                    throw new Error(result.message || 'Failed to create user');
                }
            } catch (error) {
                console.error('User creation error (full):', error);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                showToast(error.message || 'Failed to create user account', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<div class="button-content"><span class="button-text">Create User Account</span></div>';
            }
        });
    }
});
