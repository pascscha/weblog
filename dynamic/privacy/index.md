# Privacy Policy

**Last updated: 2025-05-09** ([history](https://codeberg.org/pascscha/weblog/commits/main/dynamic/privacy/index.md))

Your privacy is important to me. Unlike big faceless corporations that start their privacy policies with this statement, I actually mean it. This policy explains what information is collected when you visit [schaerli.org](https://schaerli.org), how it's handled, and your rights. Since this is a static website with no backend processing, data collection is minimal.

## Information I Collect

Like any website, your browser inevitably sends technical details to my server when you visit:

- Your device's IP address
- Your browser/application (e.g., Chrome 115, Firefox Mobile)
- Referring site (if you clicked a link from elsewhere)
- Pages visited (e.g., specific blog posts)

These details are written to server log files, which I occasionally review for debugging, traffic analysis, and security monitoring. Since the site is hosted on a cloud server, my provider could theoretically access these logs, though this is unlikely.

Ultimately, this information is standard for any website visit. If concerned, consider hiding your IP address (e.g., using [Tor](https://www.torproject.org/)) or browser fingerprinting tools like [Chameleon](https://sereneblue.github.io/chameleon/about/).

### Local Storage

My site offers <a id="inline-theme-toggle">light/dark</a> mode. To preserve your preference between visits, JavaScript saves your theme choice in your browser's [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). This data remains exclusively on your device and is never sent to my server.

<script>
const inlineThemeToggle = document.getElementById('inline-theme-toggle');
inlineThemeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    themeStorage.setTheme(currentTheme === 'light' ? 'dark' : 'light');
});
</script>

### JavaScript

While some features (theme switching, homepage animations, table of contents) require JavaScript, core site functionality remains accessible without it. You can disable JavaScript while still using this site.

### Minified Files

HTML, CSS, and JavaScript files are minified for faster loading. Each minified file links to its original version, and the complete source code is available in my [Codeberg repository](https://codeberg.org/pascscha/weblog) (GPLv3 licensed).

### Third Parties

To optimize loading speeds, I use third-party CDNs for resources like FontAwesome icons. This requires your browser to connect to these services, exposing your IP address and user agent. Some posts contain YouTube videos, which are embedded via `youtube-nocookie.com` to prevent viewing activity being linked to your YouTube account.

I have no control over data collected by third parties. For details, review their policies:

- [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/)
- [Google & YouTube Privacy Policy](https://policies.google.com/privacy)

### Policy Updates

Changes to this policy will be posted here with updated effective dates. I encourage periodic review to stay informed. You can also see the history of this policy on [Codeberg](https://codeberg.org/pascscha/weblog/commits/main/dynamic/privacy/index.md).

### Contact

For questions or concerns about this privacy policy, contact me at:  
[privacy@schaerli.org](mailto:privacy@schaerli.org)
