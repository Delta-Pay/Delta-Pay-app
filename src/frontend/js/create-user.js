const randomUserData = {
  firstNames: [
    "Liam",
    "Aria",
    "Ethan",
    "Zara",
    "Noah",
    "Maya",
    "Oliver",
    "Luna",
  ],
  lastNames: [
    "Thompson",
    "Rodriguez",
    "Patel",
    "Chen",
    "Anderson",
    "Williams",
    "Martinez",
    "Johnson",
  ],
  nationalities: [
    "Canadian",
    "Australian",
    "British",
    "German",
    "French",
    "Irish",
    "Swedish",
    "Norwegian",
  ],
  occupations: [
    "Data Analyst",
    "Marketing Manager",
    "Civil Engineer",
    "Graphic Designer",
    "Teacher",
    "Accountant",
    "Pharmacist",
    "Architect",
  ],
  cities: [
    "Toronto",
    "Melbourne",
    "Manchester",
    "Berlin",
    "Lyon",
    "Dublin",
    "Stockholm",
    "Oslo",
  ],
  stateProvinces: [
    "Ontario",
    "Victoria",
    "Lancashire",
    "Bavaria",
    "Auvergne",
    "Leinster",
    "Sodermanland",
    "Viken",
  ],
  countries: [
    "Canada",
    "Australia",
    "United Kingdom",
    "Germany",
    "France",
    "Ireland",
    "Sweden",
    "Norway",
  ],
  streets: [
    "Maple Avenue",
    "Harbor View Drive",
    "Oak Street",
    "Riverside Road",
    "Elm Boulevard",
    "Park Lane",
    "Cedar Court",
    "Lake Drive",
  ],
  postalCodes: [
    "M5H2N2",
    "3000",
    "M13PL",
    "80331",
    "69001",
    "D02XY45",
    "11122",
    "0150",
  ],
  languages: [
    "English",
    "French",
    "German",
    "Spanish",
    "Swedish",
    "Norwegian",
    "Italian",
    "Portuguese",
  ],
  currencies: ["ZAR", "CAD", "AUD", "GBP", "EUR", "CHF", "SEK", "NOK"],
  accountTypes: ["Standard", "Premium", "Business"],
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomDigits(length) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

function generateRandomDate() {
  const year = 1960 + Math.floor(Math.random() * 43);
  const month = (1 + Math.floor(Math.random() * 12))
    .toString()
    .padStart(2, "0");
  const day = (1 + Math.floor(Math.random() * 28)).toString().padStart(2, "0");
  return `${day}/${month}/${year}`;
}

function generateRandomCardExpiry() {
  const month = (1 + Math.floor(Math.random() * 12))
    .toString()
    .padStart(2, "0");
  const year = (25 + Math.floor(Math.random() * 8)).toString().padStart(2, "0");
  return `${month}/${year}`;
}

function generateRandomPhoneNumber() {
  const countryCodes = ["+1", "+61", "+44", "+49", "+33", "+353", "+46", "+47"];
  const countryCode = getRandomElement(countryCodes);
  const areaCode = generateRandomDigits(2);
  const firstPart = generateRandomDigits(3);
  const secondPart = generateRandomDigits(4);
  return `${countryCode}-${areaCode}-${firstPart}-${secondPart}`;
}

function generateRandomEmail(firstName, lastName) {
  const domains = [
    "email.com",
    "mail.com",
    "inbox.com",
    "webmail.com",
    "post.com",
  ];
  const separators = [".", "_", ""];
  const separator = getRandomElement(separators);
  const domain = getRandomElement(domains);
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}@${domain}`;
}

function generateRandomUsername(firstName, lastName) {
  const suffixes = [
    "",
    generateRandomDigits(2),
    generateRandomDigits(3),
    "_" + generateRandomDigits(2),
  ];
  const suffix = getRandomElement(suffixes);
  const variations = [
    firstName.toLowerCase() + suffix,
    lastName.toLowerCase() + suffix,
    (firstName.charAt(0) + lastName).toLowerCase() + suffix,
    (firstName + lastName.charAt(0)).toLowerCase() + suffix,
  ];
  return getRandomElement(variations);
}

function generateStrongPassword() {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "@$!%*?&";

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = lowercase + uppercase + numbers + special;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function randomizeFormData() {
  const firstName = getRandomElement(randomUserData.firstNames);
  const lastName = getRandomElement(randomUserData.lastNames);
  const fullName = `${firstName} ${lastName}`;
  const username = generateRandomUsername(firstName, lastName);
  const email = generateRandomEmail(firstName, lastName);
  const password = generateStrongPassword();
  const nationality = getRandomElement(randomUserData.nationalities);
  const occupation = getRandomElement(randomUserData.occupations);
  const city = getRandomElement(randomUserData.cities);
  const stateProvince = getRandomElement(randomUserData.stateProvinces);
  const country = getRandomElement(randomUserData.countries);
  const street = getRandomElement(randomUserData.streets);
  const postalCode = getRandomElement(randomUserData.postalCodes);
  const language = getRandomElement(randomUserData.languages);
  const currency = getRandomElement(randomUserData.currencies);
  const accountType = getRandomElement(randomUserData.accountTypes);

  document.getElementById("fullName").value = fullName;
  document.getElementById("idNumber").value = generateRandomDigits(13);
  document.getElementById("dateOfBirth").value = generateRandomDate();
  document.getElementById("nationality").value = nationality;
  document.getElementById("occupation").value = occupation;
  document.getElementById("username").value = username;

  const accountNum = generateRandomDigits(16);
  const formattedAccountNum = accountNum.match(/.{1,4}/g).join(" ");
  document.getElementById("accountNumber").value = formattedAccountNum;

  document.getElementById("password").value = password;
  document.getElementById("confirmPassword").value = password;

  document
    .getElementById("password")
    .dispatchEvent(new Event("input", { bubbles: true }));

  document.getElementById("accountType").value = accountType;
  document.getElementById("currency").value = currency;

  const balance = (Math.random() * 50000 + 1000).toFixed(2);
  document.getElementById("accountBalance").value = balance;

  const income = Math.floor(Math.random() * 150000 + 30000);
  document.getElementById("annualIncome").value = income;

  document.getElementById("email").value = email;
  document.getElementById("phoneNumber").value = generateRandomPhoneNumber();

  const streetNumber = Math.floor(Math.random() * 999 + 1);
  document.getElementById("addressLine1").value = `${streetNumber} ${street}`;

  const aptNumbers = ["", "Apt 2B", "Suite 100", "Unit 5", "Floor 3"];
  document.getElementById("addressLine2").value = getRandomElement(aptNumbers);

  document.getElementById("city").value = city;
  document.getElementById("stateProvince").value = stateProvince;
  document.getElementById("postalCode").value = postalCode;
  document.getElementById("country").value = country;
  document.getElementById("preferredLanguage").value = language;

  const cardNum = generateRandomDigits(16);
  const formattedCardNum = cardNum.match(/.{1,4}/g).join(" ");
  document.getElementById("cardNumber").value = formattedCardNum;
  document.getElementById("cardExpiry").value = generateRandomCardExpiry();
  document.getElementById("cardCvv").value = generateRandomDigits(3);
  document.getElementById("cardHolderName").value = fullName;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createUserForm");
  const backBtn = document.getElementById("backToAdminBtn");
  const randomizeBtn = document.getElementById("randomizeDataBtn");

  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      globalThis.location.href = "/view-payments";
    });
  }

  if (randomizeBtn) {
    randomizeBtn.addEventListener("click", () => {
      randomizeFormData();
      randomizeBtn.style.background = "#655A7C";
      setTimeout(() => {
        randomizeBtn.style.background = "#8DA8C7";
      }, 200);
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

    const cardCvv = document.getElementById("cardCvv");
    cardCvv.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3);
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
          cardCvv: document.getElementById("cardCvv").value.trim(),
          cardHolderName: document
            .getElementById("cardHolderName")
            .value.trim(),
        };

        console.log("Submitting user creation request:", {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
        });

        let response;
        try {
          response = await fetch("/api/admin/users/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          });
        } catch (networkError) {
          console.error("Network error during user creation:", networkError);
          throw new Error(
            "Network error: Unable to reach server. Please check your connection.",
          );
        }

        if (!response) {
          console.error("No response received from server");
          throw new Error("No response from server. Please try again.");
        }

        if (!response.ok) {
          console.error(
            "HTTP error response:",
            response.status,
            response.statusText,
          );
          if (response.status === 500) {
            throw new Error("Server error. Please contact support.");
          } else if (response.status === 400) {
            throw new Error("Invalid request data. Please check all fields.");
          } else if (response.status === 401 || response.status === 403) {
            throw new Error("Unauthorized. Please log in again.");
          } else {
            throw new Error(
              `Request failed: ${response.status} ${response.statusText}`,
            );
          }
        }

        console.log("Response status:", response.status);

        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          console.error("Failed to parse response JSON:", parseError);
          throw new Error("Invalid response format from server");
        }

        if (!result || typeof result !== "object") {
          console.error("Invalid result object:", result);
          throw new Error("Invalid response from server");
        }

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
