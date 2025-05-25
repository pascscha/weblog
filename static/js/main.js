// Theme
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Function to set theme with domain-wide cookie
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Set cookie for root domain with 1 year expiry
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        document.cookie = `theme=${theme}; expires=${date.toUTCString()}; path=/; domain=.pascscha.ch`;
    }

    // Function to get theme from cookie
    function getTheme() {
        const match = document.cookie.match(/theme=([^;]+)/);
        return match ? match[1] : null;
    }

    // Initialize theme
    function initializeTheme() {
        const savedTheme = getTheme();
        if (savedTheme) {
            setTheme(savedTheme);
            return;
        }

        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    }

    // Toggle theme
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!getTheme()) {
            setTheme(e.matches ? 'light' : 'dark');
        }
    });

    // Initialize on page load
    initializeTheme();
});