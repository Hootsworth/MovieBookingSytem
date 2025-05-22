// public/js/auth.js
document.addEventListener('DOMContentLoaded', function () {
    // Panel Divs
    const initialOptionsPanel = document.getElementById('initialOptionsPanel');
    const loginFormPanel = document.getElementById('loginForm'); // Corrected to use the form ID as the panel
    const registerFormPanel = document.getElementById('registerForm'); // Corrected
    const forgotPasswordFormPanel = document.getElementById('forgotPasswordForm'); // New
    const resetPasswordFormPanel = document.getElementById('resetPasswordForm'); // New

    // Actual Forms (already used as panels above, but can get them directly too)
    // const loginForm = document.getElementById('loginForm');
    // const registerForm = document.getElementById('registerForm');
    // const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    // const resetPasswordForm = document.getElementById('resetPasswordForm');


    // Buttons and Links
    const showUserLoginBtn = document.getElementById('showUserLoginBtn');
    const showAdminLoginBtn = document.getElementById('showAdminLoginBtn');
    const showRegisterFormLinkFromOptions = document.getElementById('showRegisterFormLinkFromOptions');
    const showRegisterFormLinkFromLogin = document.getElementById('showRegisterFormLinkFromLogin');
    const showLoginFormLinkFromRegister = document.getElementById('showLoginFormLinkFromRegister');
    const backToOptionsLinks = document.querySelectorAll('.back-to-options-link');

    // Forgot Password Links
    const showForgotPasswordFormLink = document.getElementById('showForgotPasswordFormLink');
    const backToLoginFromForgot = document.getElementById('backToLoginFromForgot');
    const backToLoginFromReset = document.getElementById('backToLoginFromReset');


    // Form specific elements
    const loginFormTitle = document.getElementById('loginFormTitle');
    const loginTypeInput = document.getElementById('loginType');
    const authFormDescription = document.getElementById('authFormDescription');


    // Message Area
    const authMessageArea = document.getElementById('authMessageArea');

    const DEBUG = true;
    function debug(message, data) {
        if (DEBUG) {
            console.log(`🔍 ${message}`, data || '');
        }
    }

    if (!loginFormPanel) debug('❌ loginForm panel not found in DOM');
    if (!registerFormPanel) debug('❌ registerForm panel not found in DOM');
    if (!initialOptionsPanel) debug('❌ initialOptionsPanel not found in DOM');
    if (!forgotPasswordFormPanel) debug('❌ forgotPasswordForm panel not found in DOM');
    if (!resetPasswordFormPanel) debug('❌ resetPasswordForm panel not found in DOM');
    if (!authMessageArea) debug('❌ authMessageArea not found in DOM');

    function displayAuthMessage(message, type = 'error') {
        debug(`Displaying auth message: ${message} (${type})`);
        if (!authMessageArea) return;
        
        authMessageArea.innerHTML = `<p class="${type}">${message}</p>`;
        authMessageArea.style.display = 'block';
        
        setTimeout(() => {
            authMessageArea.style.display = 'none';
            authMessageArea.innerHTML = '';
        }, 7000); // Increased timeout for messages
    }

    function showPanel(panelIdToShow) {
        debug(`Showing panel: ${panelIdToShow}`);
        const panels = [initialOptionsPanel, loginFormPanel, registerFormPanel, forgotPasswordFormPanel, resetPasswordFormPanel];
        panels.forEach(panel => {
            if (panel) { // Check if panel exists
                panel.style.display = (panel.id === panelIdToShow) ? 'block' : 'none';
            }
        });

        if (authMessageArea) authMessageArea.style.display = 'none';

        // Update header description based on panel
        let description = "Sign in or manage your account.";
        if (panelIdToShow === 'loginForm') {
            description = loginTypeInput.value === 'Admin' ? 'Admin Sign In' : 'User Sign In';
        } else if (panelIdToShow === 'registerForm') {
            description = "Create your CineVerse Account.";
        } else if (panelIdToShow === 'forgotPasswordForm') {
            description = "Request a password reset.";
        } else if (panelIdToShow === 'resetPasswordForm') {
            description = "Complete your password reset.";
        }
        if(authFormDescription) authFormDescription.textContent = description;
        if(panelIdToShow === 'initialOptionsPanel' && authFormDescription) authFormDescription.textContent = "Sign in or manage your account.";

    }

    // Initial Panel Setup
    if (initialOptionsPanel) showPanel('initialOptionsPanel');
    else if (loginFormPanel) showPanel('loginForm'); // Fallback if no initial options

    // Event Listeners for Panel Navigation
    if (showUserLoginBtn) {
        showUserLoginBtn.addEventListener('click', () => {
            showPanel('loginForm');
            if(loginFormTitle) loginFormTitle.textContent = 'User Sign In';
            if(loginTypeInput) loginTypeInput.value = 'Customer';
        });
    }

    if (showAdminLoginBtn) {
        showAdminLoginBtn.addEventListener('click', () => {
            showPanel('loginForm');
            if(loginFormTitle) loginFormTitle.textContent = 'Admin Sign In';
            if(loginTypeInput) loginTypeInput.value = 'Admin';
        });
    }

    if (showRegisterFormLinkFromOptions) {
        showRegisterFormLinkFromOptions.addEventListener('click', (e) => { e.preventDefault(); showPanel('registerForm'); });
    }
    if (showRegisterFormLinkFromLogin) {
        showRegisterFormLinkFromLogin.addEventListener('click', (e) => { e.preventDefault(); showPanel('registerForm'); });
    }
    if (showLoginFormLinkFromRegister) {
        showLoginFormLinkFromRegister.addEventListener('click', (e) => {
            e.preventDefault();
            showPanel('loginForm');
            if(loginFormTitle && loginTypeInput) { // Keep previous login type or default
                loginFormTitle.textContent = loginTypeInput.value === 'Admin' ? 'Admin Sign In' : 'User Sign In';
            } else if (loginFormTitle) {
                 loginFormTitle.textContent = 'User Sign In'; // Default
            }
        });
    }
    backToOptionsLinks.forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); showPanel('initialOptionsPanel'); });
    });

    // Forgot Password Navigation
    if (showForgotPasswordFormLink) {
        showForgotPasswordFormLink.addEventListener('click', (e) => { e.preventDefault(); showPanel('forgotPasswordForm'); });
    }
    if (backToLoginFromForgot) {
        backToLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); showPanel('loginForm'); });
    }
    if (backToLoginFromReset) {
        backToLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); showPanel('loginForm'); });
    }


    // Login Form Submission
    if (loginFormPanel) {
        loginFormPanel.addEventListener('submit', async function(e) {
            e.preventDefault();
            // ... (existing login submission logic - no changes needed here specifically for forgot password)
            // Ensure it's complete as per original file
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            if (!emailInput || !passwordInput) {
                displayAuthMessage('Form elements missing.', 'error'); return;
            }
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            if (!email || !password) {
                displayAuthMessage('Please enter both email and password.', 'error'); return;
            }
            try {
                displayAuthMessage('Logging in...', 'info');
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Login failed.');
                sessionStorage.setItem('cineverse_user', JSON.stringify(data.user));
                displayAuthMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    const redirectTarget = data.user.user_type.toLowerCase() === 'admin' 
                        ? '/admin/dashboard.html' 
                        : '/user-dashboard.html';
                    window.location.href = redirectTarget;
                }, 1000);
            } catch (error) {
                displayAuthMessage(error.message, 'error');
                console.error('Login error:', error);
            }
        });
    }

    // Registration Form Submission
    if (registerFormPanel) {
        registerFormPanel.addEventListener('submit', async function(e) {
            e.preventDefault();
            // ... (existing registration submission logic - no changes needed here)
            // Ensure it's complete as per original file
            const usernameInput = document.getElementById('registerUsername');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
             if (!usernameInput || !emailInput || !passwordInput) {
                displayAuthMessage('Form elements missing.', 'error'); return;
            }
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !email || !password) {
                displayAuthMessage('Please fill out all fields.', 'error'); return;
            }
            if (!/^\S+@\S+\.\S+$/.test(email)) {
                displayAuthMessage('Invalid email format.', 'error'); return;
            }
            if (password.length < 6) {
                displayAuthMessage('Password must be at least 6 characters.', 'error'); return;
            }
            try {
                displayAuthMessage('Creating account...', 'info');
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                    credentials: 'include'
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Registration failed.');
                displayAuthMessage('Registration successful! Redirecting to login.', 'success');
                registerFormPanel.reset();
                setTimeout(() => {
                    showPanel('loginForm');
                    if(loginFormTitle) loginFormTitle.textContent = 'User Sign In';
                    if(loginTypeInput) loginTypeInput.value = 'Customer';
                }, 2000);
            } catch (error) {
                displayAuthMessage(error.message, 'error');
                console.error('Registration error:', error);
            }
        });
    }

    // Forgot Password Form Submission (Request OTP)
    if (forgotPasswordFormPanel) {
        forgotPasswordFormPanel.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('forgotUsername');
            const secondaryEmailInput = document.getElementById('forgotSecondaryEmail');
            
            if (!usernameInput || !secondaryEmailInput) {
                displayAuthMessage('Form elements missing for forgot password.', 'error'); return;
            }
            const username = usernameInput.value.trim();
            const secondaryEmail = secondaryEmailInput.value.trim();

            if (!username || !secondaryEmail) {
                displayAuthMessage('Please enter username and secondary email.', 'error'); return;
            }
            if (!/^\S+@\S+\.\S+$/.test(secondaryEmail)) {
                displayAuthMessage('Invalid secondary email format.', 'error'); return;
            }

            try {
                displayAuthMessage('Requesting OTP...', 'info');
                const response = await fetch('/api/auth/request-password-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, secondaryEmail })
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to request OTP.');
                }
                
                displayAuthMessage(data.message, 'success'); // "OTP sent..."
                document.getElementById('resetUsernameStore').value = username; // Store username for the next step
                showPanel('resetPasswordForm');
                forgotPasswordFormPanel.reset();

            } catch (error) {
                displayAuthMessage(error.message, 'error');
                console.error('Forgot password error:', error);
            }
        });
    }

    // Reset Password Form Submission
    if (resetPasswordFormPanel) {
        resetPasswordFormPanel.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('resetUsernameStore').value; // Get stored username
            const otpInput = document.getElementById('resetOtp');
            const newPasswordInput = document.getElementById('resetNewPassword');

            if (!otpInput || !newPasswordInput || !username) {
                 displayAuthMessage('Form elements missing or username not found for reset.', 'error'); return;
            }
            const otp = otpInput.value.trim();
            const newPassword = newPasswordInput.value.trim();

            if (!otp || !newPassword) {
                displayAuthMessage('Please enter OTP and new password.', 'error'); return;
            }
            if (newPassword.length < 6) {
                displayAuthMessage('New password must be at least 6 characters long.', 'error'); return;
            }

            try {
                displayAuthMessage('Resetting password...', 'info');
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, otp, newPassword })
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to reset password.');
                }
                
                displayAuthMessage(data.message, 'success'); // "Password reset successfully..."
                resetPasswordFormPanel.reset();
                document.getElementById('resetUsernameStore').value = ''; // Clear stored username
                setTimeout(() => {
                    showPanel('loginForm'); // Redirect to login
                     if(loginFormTitle) loginFormTitle.textContent = 'User Sign In'; // Default to user login
                     if(loginTypeInput) loginTypeInput.value = 'Customer';
                }, 3000);


            } catch (error) {
                displayAuthMessage(error.message, 'error');
                console.error('Reset password error:', error);
            }
        });
    }
    
    // Initial state (already called above, ensuring it's the last step for panel visibility)
    // showPanel('initialOptionsPanel'); // Or whatever the default should be

    // Debug test session button (from original file)
    const testSessionBtn = document.createElement('button');
    // ... (rest of the testSessionBtn code from original auth.js if needed)
    if (DEBUG && document.body && typeof document.body.appendChild === 'function') {
        // Simple test button (if you need the full debug button, copy from original file)
        testSessionBtn.textContent = 'Test Session (Client)';
        testSessionBtn.style.position = 'fixed'; testSessionBtn.style.bottom = '10px'; testSessionBtn.style.left = '10px';
        testSessionBtn.style.zIndex = '10000';
        testSessionBtn.onclick = async () => {
            try {
                const res = await fetch('/api/auth/session');
                const data = await res.json(); alert(JSON.stringify(data));
            } catch (err) { alert('Session test error: ' + err); }
        };
        // document.body.appendChild(testSessionBtn); // Uncomment to add
    }

});