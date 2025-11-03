<div align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
  <img src="src/Icons/DeltaPayReadMELogo.svg" alt="Delta Pay Logo" width="1000" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));"/>
</div>


Delta pay is a mockup of an international payment solution. It features multiple security features and data security layers with a clean and structured layout. 

## UI Structure

### General Layout:
- Delta Pay logo in the top right corner of the page.
- text next to logo.
- text color for logo is #AB92BF while outline of the top bar is #655A7C
- any additional elements can either be #8da8c7ff or #CEF9F2
- background doesn't have to be white or black, can be either one of these colours mostly the purple ones
- Interfaces must be up to standard for both mobile and desktop views

### Landing page
- The landing page has 2 options. Backend view and Payment View
- The page must only have those two options. Clean in the middle look 
- Apply general layout formatting.

### Payment page
- The top right of the page is a user icon with the letter of the person's name.
- When going from the landing page to this page, ask the user to select one of the users accounts. Not bank account (of the 5 users). (this needs to happen on the landing page actually)
- once the user has select a user account to use ask them for a password. the password will use the same hashing anjd salting that was stated in the backend security features. Please also note that it needs to be a custom popup not a browser popup. 
- Once the account is selected, show the page. 
- general payment inputs with censoring for card inputs and more. Everything a normal payment gateway should have. IT needs to enter card info 
- Clean slow animations to not overload the user, but give a strong, modern, secure look
- Once the submit button is clicked, a clean prompt emerges with a tick animation saying payment sent.

### Backend view.
- The page is used to show the database and the payments, and then approve or deny them.
- apply general layout rules
- The admin has no users 
- Have a log of users who have been kicked off the site or have attempted to exploit the page through the security measures we have discussed.
- The log must have all redirections and user navigation with IP logging and user account tracking. 


## Frontend Technologies

- React - Customer and employee portals
- JSON Web Tokens (JWT) - Authentication
- HTTPS/TLS 1.3 - Transport security
- Content Security Policy (CSP) - [XSS attacks]
- X-Frame-Options: DENY - [Clickjacking]
- HttpOnly, Secure, SameSite=Strict cookies - [Session hijacking]


## Backend Technologies

- Deno - API runtime (port 3623 for main app)
- Argon2 - Password hashing/salting
- Regular Expressions (RegEx) - Input whitelisting
- Parameterised queries - [SQL injection]
- CSRF tokens - [Cross-Site Request Forgery]
- Rate limiting - [Brute force attacks]
- Database - SQLite (Not ideal for this use case, but simplifies it)

## Security Infrastructure

- Cloudflare - [DDoS attacks] (Implement later)
- Cloudflare Tunnel - [MITM attacks] (Implement later)
- WAF (Web Application Firewall) - Application protection (Implement later)
- PCI DSS compliance - Payment security (Implement later)
- Tokenisation - Sensitive data protection

## DevSecOps Pipeline

- GitHub - Version control
- CircleCI - CI/CD pipeline (Implement later)
- SonarQube - Static code analysis (Implement later)
- ScoutSuite - Cloud security auditing (Implement later)

## Data Security

- Application-level encryption - Data at rest
- Database tokenisation - Payment data
- Structured JSON logging - Security monitoring
- Session token regeneration - [Session fixation]

## Additional Components

- SWIFT integration - International payments (not needed, it's a mockup)
- Multi-currency support - Currency handling (symbols)
- Pre-registered employee system - No registration required (give temp users)
- Transaction verification workflow - Employee approval process (admin page with employee approval)



## assignment topic

You work as a developer in the internal development team for an international bank. Your team is
working on the internal international payment system. Customers often must make international
payments via the bank’s online banking site. From here, the payments need to be displayed on the
payments portal, which is only accessible by dedicated pre-registered staff. Customers need to register for
the system by providing their full name, ID number, account number, and password. As you can
imagine, this is quite sensitive information that needs to be appropriately secured. After registering,
customers need to log on to the website by providing their username, account number and
password. Once logged on, the customer should be able to enter the amount they need to pay,
choose the relevant currency and choose a provider to make the payment. In South Africa, we
mainly make use of SWIFT. They will next be prompted for the account information and SWIFT code
for which they wish the payment to be made. The customer will finalise their process by clicking on
Pay Now.
From here, the transaction should be stored in a secure database and appear on the international
payments portal. Employees of the bank are pre-registered on the portal when they are employed.
No registration is necessary; however, they do need to log on to the system to check transactions
and forward them to SWIFT for payment. This is done by checking the payee's account information
and verifying that the SWIFT code is correct. The employees complete the transaction by clicking a
verified button next to each entry and finally by clicking submit to SWIFT – your job ends when that
button is clicked. 
