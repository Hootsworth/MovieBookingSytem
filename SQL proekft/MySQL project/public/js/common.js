// public/js/common.js

// Function to be called on pages that need user info and logout
function initializeCommon() {
    const userWelcomeText = document.getElementById('userWelcomeText') || document.getElementById('userWelcome') || document.getElementById('adminWelcome');
    const logoutButton = document.getElementById('logoutButton') || document.getElementById('logoutBtn');
    const currentYearSpan = document.getElementById('currentYear') || document.getElementById('currentYearConfirm');

    // Display user welcome message
    const storedUser = sessionStorage.getItem('cineverse_user');
    if (userWelcomeText && storedUser) {
        try {
            const user = JSON.parse(storedUser);
            userWelcomeText.textContent = `Welcome, ${user.username || 'User'}!`;
        } catch (e) {
            console.error('Error parsing user from session storage for welcome message:', e);
            userWelcomeText.textContent = 'Welcome!';
        }
    } else if (userWelcomeText) {
        // Fallback if user info is not available but element exists
        userWelcomeText.textContent = 'Welcome!';
    }

    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                if (response.ok) {
                    sessionStorage.removeItem('cineverse_user');
                    // localStorage.removeItem('cineverse_token'); // If using JWT tokens
                    window.location.href = 'http://localhost:3000'; // Redirect to login page
                } else {
                    const data = await response.json();
                    alert(data.message || 'Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('An error occurred during logout.');
            }
        });
    }

    // Update current year in footer
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Check session on page load (optional, but good for redirecting if not logged in on protected pages)
    // This is a basic check. More robust checks might be needed.
    // Skip this check for login page itself.
    if (!window.location.pathname.endsWith('/login.html') && !window.location.pathname.endsWith('/')) {
        if (!storedUser) {
            console.log('No user session found, redirecting to login.');
            // window.location.href = '/login.html';
        } else {
            // Optionally, verify session with backend
            // fetch('/api/auth/session').then(res => res.json()).then(data => {
            // if (!data.isLoggedIn) window.location.href = '/login.html';
            // });
        }
    }
}

// Call initializeCommon on relevant pages, or if this script is loaded on all pages,
// it can be called directly here, but DOMContentLoaded is safer.
document.addEventListener('DOMContentLoaded', () => {
    // Call initializeCommon if it's not the login page, to avoid conflicts with auth.js
    if (!document.body.classList.contains('page-login')) { // Add 'page-login' class to login body
        initializeCommon();
    }
});
