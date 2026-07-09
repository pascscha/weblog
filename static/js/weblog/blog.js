function scrollToSection(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href').slice(1);
    const targetElement = document.getElementById(targetId);
    const headerHeight = document.querySelector('header').offsetHeight;
    const extraOffset = 20;
    const totalOffset = headerHeight + extraOffset;

    window.scrollTo({
        top: targetElement.offsetTop - totalOffset,
        behavior: 'smooth'
    });

    history.replaceState(null, '', `#${targetId}`);
}

function scrollToHeading(event) {
    const heading = event.currentTarget;
    const headerHeight = document.querySelector('header').offsetHeight;
    const extraOffset = 20;
    const totalOffset = headerHeight + extraOffset;

    window.scrollTo({
        top: heading.offsetTop - totalOffset,
        behavior: 'smooth'
    });

    history.replaceState(null, '', `#${heading.id}`);
}

function generateTOC() {
    const toc = document.getElementById('toc');
    const headings = document.querySelectorAll('#rendered-content h2, #rendered-content h3');
    const tocList = document.createElement('ul');

    headings.forEach((heading, index) => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');

        // Create an id for the heading if it doesn't have one
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }

        link.textContent = heading.textContent;
        link.href = `#${heading.id}`;
        link.addEventListener('click', scrollToSection);

        listItem.appendChild(link);
        tocList.appendChild(listItem);

        // Indent sub-headings
        if (heading.tagName === 'H2') {
            listItem.style.marginLeft = '20px';
        } else if (heading.tagName === 'H3') {
            listItem.style.marginLeft = '40px';
        }
    });

    toc.appendChild(tocList);
}


function highlightTOC() {
    const headings = Array.from(document.querySelectorAll('#rendered-content h2, #rendered-content h3'));
    const tocLinks = document.querySelectorAll('#toc a');
    const headerHeight = document.querySelector('header').offsetHeight;

    // Sort headings by their distance from the top of the viewport
    headings.sort((a, b) => {
        return Math.abs(a.getBoundingClientRect().top - headerHeight) -
            Math.abs(b.getBoundingClientRect().top - headerHeight);
    });

    // The first heading in the sorted array is the closest to the top
    const closestHeading = headings[0];

    // Remove 'active' class from all links
    tocLinks.forEach(link => link.classList.remove('active'));

    // Add 'active' class to the link corresponding to the closest heading
    tocLinks.forEach(link => {
        if (link.getAttribute('href') === `#${closestHeading.id}`) {
            link.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    generateTOC();
    highlightTOC();
    window.addEventListener('scroll', highlightTOC);

    document.querySelectorAll('#rendered-content h2, #rendered-content h3').forEach(heading => {
        heading.addEventListener('click', scrollToHeading);
    });

    setupCopyTooltip();
});

function copyCurrentURL(e) {
    e.preventDefault();
    const tooltip = document.getElementById('copy-tooltip');
    tooltip.textContent = 'URL copied!';
    tooltip.style.display = 'block';

    navigator.clipboard.writeText(window.location.href)
        .catch(err => {
            console.error('Failed to copy URL:', err);
        });
}

function setupCopyTooltip() {
    const copyLink = document.querySelector('.share-button');
    const tooltip = document.getElementById('copy-tooltip');
    if (!copyLink || !tooltip) return;

    copyLink.addEventListener('mouseenter', () => {
        tooltip.textContent = 'Copy URL';
        tooltip.style.display = 'block';
    });

    copyLink.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}