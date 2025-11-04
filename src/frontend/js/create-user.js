// {"Backend view - Have a log of users who have been kicked off the site or have attempted to exploit the page through the security measures we have discussed."} --> {Admin can create new users with comprehensive validation, password strength requirements, and security logging}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createUserForm");
  const backBtn = document.getElementById("backToAdminBtn");

  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      globalThis.location.href = "/view-payments";
    });
  }

  if (form) {
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirmPassword = document.getElementById(
      "toggleConfirmPassword",
    );
    const eyeIcon = document.getElementById("eyeIcon");
    const eyeIconConfirm = document.getElementById("eyeIconConfirm");

    togglePassword.addEventListener("click", () => {
      const type = password.type === "password" ? "text" : "password";
      password.type = type;

      if (type === "text") {
        eyeIcon.innerHTML =
          '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      } else {
        eyeIcon.innerHTML =
          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    });

    toggleConfirmPassword.addEventListener("click", () => {
      const type = confirmPassword.type === "password" ? "text" : "password";
      confirmPassword.type = type;

      if (type === "text") {
        eyeIconConfirm.innerHTML =
          '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      } else {
        eyeIconConfirm.innerHTML =
          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    });

    const passwordStrength = document.getElementById("passwordStrength");
    const passwordStrengthBar = document.getElementById("passwordStrengthBar");
    const passwordStrengthText = document.getElementById(
      "passwordStrengthText",
    );

    function calculatePasswordStrength(pwd) {
      let strength = 0;
      const checks = {
        length: pwd.length >= 8,
        lowercase: /[a-z]/.test(pwd),
        uppercase: /[A-Z]/.test(pwd),
        number: /\d/.test(pwd),
        special: /[@$!%*?&]/.test(pwd),
        longLength: pwd.length >= 12,
      };

      if (checks.length) strength += 1;
      if (checks.lowercase) strength += 1;
      if (checks.uppercase) strength += 1;
      if (checks.number) strength += 1;
      if (checks.special) strength += 1;
      if (checks.longLength) strength += 1;

      return { strength, checks };
    }

    password.addEventListener("input", () => {
      const pwd = password.value;

      if (pwd.length === 0) {
        passwordStrength.style.display = "none";
        return;
      }

      passwordStrength.style.display = "block";
      const { strength, checks } = calculatePasswordStrength(pwd);

      const maxStrength = 6;
      const percentage = (strength / maxStrength) * 100;
      passwordStrengthBar.style.width = percentage + "%";

      let color, text;
      if (strength <= 2) {
        color = "#D4B5E0";
        text = "Weak";
      } else if (strength === 3) {
        color = "#BDA0CE";
        text = "Fair";
      } else if (strength === 4) {
        color = "#AB92BF";
        text = "Good";
      } else if (strength === 5) {
        color = "#8A75A0";
        text = "Strong";
      } else {
        color = "#655A7C";
        text = "Very Strong";
      }

      passwordStrengthBar.style.backgroundColor = color;
      passwordStrengthText.textContent = text;
      passwordStrengthText.style.color = color;

      const submitBtn = document.getElementById("submitBtn");
      if (strength < 5) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
      } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    });

    confirmPassword.addEventListener("input", () => {
      if (password.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity("Passwords do not match");
      } else {
        confirmPassword.setCustomValidity("");
      }
    });

    const cardExpiry = document.getElementById("cardExpiry");
    cardExpiry.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length >= 2) {
        value = value.slice(0, 2) + "/" + value.slice(2, 4);
      }
      e.target.value = value;
    });

    const phoneNumber = document.getElementById("phoneNumber");
    phoneNumber.addEventListener("input", (e) => {
      let value = e.target.value.replace(/[^\d+]/g, "");
      if (value.length > 0 && !value.startsWith("+")) {
        value = "+" + value;
      }

      if (value.length > 3) {
        const countryCode = value.slice(0, 3);
        const rest = value.slice(3).replace(/\D/g, "");
        if (rest.length <= 2) {
          value = countryCode + (rest ? "-" + rest : "");
        } else if (rest.length <= 5) {
          value =
            countryCode +
            "-" +
            rest.slice(0, 2) +
            (rest.length > 2 ? "-" + rest.slice(2) : "");
        } else {
          value =
            countryCode +
            "-" +
            rest.slice(0, 2) +
            "-" +
            rest.slice(2, 5) +
            (rest.length > 5 ? "-" + rest.slice(5, 9) : "");
        }
      }
      e.target.value = value;
    });

    const idNumber = document.getElementById("idNumber");
    idNumber.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
    });

    const accountNumber = document.getElementById("accountNumber");
    accountNumber.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "").slice(0, 20);
      if (value.length > 4) {
        value = value.match(/.{1,4}/g).join(" ");
      }
      e.target.value = value;
    });

    const cardNumber = document.getElementById("cardNumber");
    cardNumber.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "").slice(0, 16);
      if (value.length > 4) {
        value = value.match(/.{1,4}/g).join(" ");
      }
      e.target.value = value;
    });

    const postalCode = document.getElementById("postalCode");
    postalCode.addEventListener("input", (e) => {
      e.target.value = e.target.value
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
    });

    const dateOfBirth = document.getElementById("dateOfBirth");
    dateOfBirth.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length >= 2) {
        value = value.slice(0, 2) + "/" + value.slice(2);
      }
      if (value.length >= 5) {
        value = value.slice(0, 5) + "/" + value.slice(5, 9);
      }
      e.target.value = value;
    });

    const fullName = document.getElementById("fullName");
    fullName.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const nationality = document.getElementById("nationality");
    nationality.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const occupation = document.getElementById("occupation");
    occupation.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const city = document.getElementById("city");
    city.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const stateProvince = document.getElementById("stateProvince");
    stateProvince.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const country = document.getElementById("country");
    country.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const preferredLanguage = document.getElementById("preferredLanguage");
    preferredLanguage.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    const cardHolderName = document.getElementById("cardHolderName");
    cardHolderName.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    });

    fullName.addEventListener("blur", () => {
      if (!cardHolderName.value && fullName.value) {
        cardHolderName.value = fullName.value;
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const { strength } = calculatePasswordStrength(password.value);
      if (strength < 5) {
        console.error("Password too weak");
        showToast(
          "Password must be at least Strong (5 out of 6 criteria)",
          "error",
        );
        return;
      }

      if (password.value !== confirmPassword.value) {
        console.error("Password mismatch");
        showToast("Passwords do not match", "error");
        return;
      }

      const submitBtn = document.getElementById("submitBtn");
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<div class="button-content"><span class="button-text">Creating Account...</span></div>';

      try {
        const dobValue = document.getElementById("dateOfBirth").value;
        let formattedDOB = dobValue;

        if (dobValue.includes("/")) {
          const parts = dobValue.split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0");
            const month = parts[1].padStart(2, "0");
            const year = parts[2];
            formattedDOB = `${year}-${month}-${day}`;
          }
        }

        const formData = {
          fullName: document.getElementById("fullName").value.trim(),
          idNumber: document
            .getElementById("idNumber")
            .value.replace(/\D/g, ""),
          accountNumber: document
            .getElementById("accountNumber")
            .value.replace(/\s/g, ""),
          username: document.getElementById("username").value.trim(),
          password: document.getElementById("password").value,
          email: document.getElementById("email").value.trim(),
          phoneNumber: document.getElementById("phoneNumber").value.trim(),
          dateOfBirth: formattedDOB,
          nationality: document.getElementById("nationality").value.trim(),
          addressLine1: document.getElementById("addressLine1").value.trim(),
          addressLine2: document.getElementById("addressLine2").value.trim(),
          city: document.getElementById("city").value.trim(),
          stateProvince: document.getElementById("stateProvince").value.trim(),
          postalCode: document.getElementById("postalCode").value.trim(),
          country: document.getElementById("country").value.trim(),
          accountBalance:
            parseFloat(document.getElementById("accountBalance").value) || 0,
          currency: document.getElementById("currency").value,
          accountType: document.getElementById("accountType").value,
          preferredLanguage:
            document.getElementById("preferredLanguage").value.trim() ||
            "English",
          occupation:
            document.getElementById("occupation").value.trim() || "Unspecified",
          annualIncome:
            parseFloat(document.getElementById("annualIncome").value) || 0,
          cardNumber: document
            .getElementById("cardNumber")
            .value.replace(/\s/g, ""),
          cardExpiry: document.getElementById("cardExpiry").value.trim(),
          cardHolderName: document
            .getElementById("cardHolderName")
            .value.trim(),
        };

        console.log("Submitting user creation request:", {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
        });

        const response = await fetch("/api/admin/users/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        console.log("Response status:", response.status);

        const result = await response.json();
        console.log("Response data:", result);

        if (result.success) {
          console.log("User created successfully with ID:", result.userId);
          showToast("User account created successfully!", "success", 3000);
          setTimeout(() => {
            globalThis.location.href = "/view-payments";
          }, 2000);
        } else {
          console.error("User creation failed:", result.message);
          throw new Error(result.message || "Failed to create user");
        }
      } catch (error) {
        console.error("User creation error (full):", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        showToast(error.message || "Failed to create user account", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          '<div class="button-content"><span class="button-text">Create User Account</span></div>';
      }
    });
  }
});
