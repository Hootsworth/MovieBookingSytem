// public/js/theme-switcher.js
document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcherButton = document.getElementById('themeSwitcher');
    const body = document.body;
    const currentTheme = localStorage.getItem('cineverse-theme');

    // Function to apply the theme
    const applyTheme = (theme) => {
        if (theme === 'light') {
            body.classList.add('light-mode');
            // Update icon state if icons are present
            if (themeSwitcherButton) {
                const sunIcon = themeSwitcherButton.querySelector('.fa-sun');
                const moonIcon = themeSwitcherButton.querySelector('.fa-moon');
                if (sunIcon) sunIcon.style.opacity = '1';
                if (moonIcon) moonIcon.style.opacity = '0';
            }
        } else {
            body.classList.remove('light-mode');
            // Update icon state
            if (themeSwitcherButton) {
                const sunIcon = themeSwitcherButton.querySelector('.fa-sun');
                const moonIcon = themeSwitcherButton.querySelector('.fa-moon');
                if (sunIcon) sunIcon.style.opacity = '0';
                if (moonIcon) moonIcon.style.opacity = '1';
            }
        }
    };

    // Apply stored theme on initial load
    if (currentTheme) {
        applyTheme(currentTheme);
    } else {
        // Default to dark mode if no theme is stored, or check system preference
        // For simplicity, defaulting to dark as per your base CSS
        applyTheme('dark');
    }

    // Event listener for the theme switcher button
    if (themeSwitcherButton) {
        themeSwitcherButton.addEventListener('click', () => {
            if (body.classList.contains('light-mode')) {
                applyTheme('dark');
                localStorage.setItem('cineverse-theme', 'dark');
                console.log('Theme switched to Dark');
            } else {
                applyTheme('light');
                localStorage.setItem('cineverse-theme', 'light');
                console.log('Theme switched to Light');
            }
        });
    } else {
        console.warn('Theme switcher button not found.');
    }
});
