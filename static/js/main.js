// Theme
const themeStorage = {
    key: 'user-theme-preference',
    
    // Save theme preference
    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(this.key, theme);
      } catch (e) {
        console.warn("LocalStorage unavailable. Theme preference won't persist.");
      }
    },
  
    // Retrieve saved theme
    getTheme() {
      try {
        return localStorage.getItem(this.key);
      } catch (e) {
        console.warn("LocalStorage access error");
        return null;
      }
    }
  };

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');


    // Initialize theme
    function initializeTheme() {
        const savedTheme = themeStorage.getTheme();
        if (savedTheme) {
            setTheme(savedTheme);
            return;
        }

        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            themeStorage.setTheme('light');
        } else {
            themeStorage.setTheme('dark');
        }
    }

    // Toggle theme
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        themeStorage.setTheme(currentTheme === 'light' ? 'dark' : 'light');
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