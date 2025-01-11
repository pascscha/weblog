function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'blog-post';

    // Create image container and image
    const imageDiv = document.createElement('div');
    imageDiv.className = 'post-image';
    const image = document.createElement('img');
    image.src = post.link + "img/thumbnail.webp";
    image.alt = `Thumbnail for ${post.title}`;
    imageDiv.appendChild(image);

    // Create post content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'post-content';

    const dateDiv = document.createElement('div');
    dateDiv.className = 'post-date';
    dateDiv.textContent = post.date;

    const titleH3 = document.createElement('h3');
    titleH3.className = 'post-title';
    const titleLink = document.createElement('a');
    titleLink.href = post.link;
    titleLink.textContent = post.title;
    titleH3.appendChild(titleLink);

    const summaryP = document.createElement('p');
    summaryP.className = 'post-summary';
    summaryP.textContent = post.description;

    // Append elements to content container
    contentDiv.appendChild(dateDiv);
    contentDiv.appendChild(titleH3);
    contentDiv.appendChild(summaryP);

    // Append image and content to article
    article.appendChild(imageDiv);
    article.appendChild(contentDiv);

    return article;
}

fetch('/blog/inventory.json')
    .then(response => response.json())
    .then(data => {
        const postList = document.querySelector('.post-list');
        data.reverse().forEach(post => {
            const postElement = createPostElement(post);
            postList.appendChild(postElement);
        });
    })
    .catch(error => {
        console.error('Error fetching blog inventory:', error);
    });