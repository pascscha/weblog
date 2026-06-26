# Privacy Policy

**Last updated: 2026-06-26** ([history](https://codeberg.org/pascscha/weblog/commits/main/dynamic/privacy/index.md))

Your privacy is important to me. Unlike big faceless corporations that start their privacy policies with this statement, I actually mean it. This policy explains what information is collected when you visit [schaerli.org](https://schaerli.org), how it's handled, and your rights. Since this is a static website with no backend processing, data collection is minimal.

## Information I Collect

Like any website, your browser inevitably sends technical details to my server when you visit:

- Your device's IP address
- Your browser/application (e.g., Chrome 115, Firefox Mobile)
- Referring site (if you clicked a link from elsewhere)
- Pages visited (e.g., specific blog posts)

Since images and videos use lazy loading (they only load as you scroll near them), the server logs can reveal approximately how far you scrolled down a page. These details are written to server log files, which I occasionally review for debugging, traffic analysis, and security monitoring. The site is hosted on a cloud server, my provider ([Hetzner](https://www.hetzner.com/legal/privacy-policy/)) could in theory access these logs too. The site does not use any external content delivery networks (CDNs). All fonts, stylesheets, scripts, videos, and other resources are served directly from this server. This costs me some extra bandwith but means that these third-party services cannot track your stay on my site through these resources.

Ultimately, this information is standard for any website visit. If concerned, consider hiding your IP address (e.g., using [Tor](https://www.torproject.org/)) or browser fingerprinting tools like [Chameleon](https://sereneblue.github.io/chameleon/about/).

### Local Storage

My site offers <a id="inline-theme-toggle" style="cursor:pointer">light/dark</a> mode. To preserve your preference between visits, JavaScript saves your theme choice in your browser's [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). This data remains exclusively on your device and is never sent to my server.

<pre><code id="theme-json-display">{
  "user-theme-preference": "dark"
}</code></pre>

<script>
const inlineThemeToggle = document.getElementById('inline-theme-toggle');
const themeDisplay = document.getElementById('theme-json-display');

function updateThemeDisplay() {
    try {
        let theme = localStorage.getItem('user-theme-preference');
        if (!theme) {
            theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        themeDisplay.textContent = '{\n  "user-theme-preference": "' + theme + '"\n}';
    } catch (e) {
        themeDisplay.textContent = '{\n  "user-theme-preference": "dark"\n}';
    }
}

inlineThemeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    themeStorage.setTheme(currentTheme === 'light' ? 'dark' : 'light');
});

new MutationObserver(() => updateThemeDisplay())
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

updateThemeDisplay();
</script>

### JavaScript

While some features (theme switching, homepage animations, table of contents) require JavaScript, core site functionality remains accessible without it. You can disable JavaScript while still using this site.

### Minified Files

HTML, CSS, and JavaScript files are minified for faster loading. Each minified file links to its original version, and the complete source code is available in my [Codeberg repository](https://codeberg.org/pascscha/weblog) (GPLv3 licensed).

### Policy Updates

Changes to this policy will be posted here with updated effective dates. I encourage periodic review to stay informed. You can also see the history of this policy on [Codeberg](https://codeberg.org/pascscha/weblog/commits/main/dynamic/privacy/index.md).

### Contact

For questions or concerns about this privacy policy, contact me at:  
[privacy@schaerli.org](mailto:privacy@schaerli.org)
