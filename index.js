const fs = require('fs').promises;
const path = require('path');
const showdown = require('showdown');
const shodownKatex = require('showdown-katex');
const cheerio = require('cheerio');
const hljs = require('highlight.js');
const { program } = require('commander');
const dayjs = require('dayjs');
const nunjucks = require('nunjucks');


const imageWithCaptionExtension = {
  type: 'output',
  filter: function (text) {
    const $ = cheerio.load(text);

    $('img').each((i, elem) => {
      const $img = $(elem);
      const alt = $img.attr('alt');

      // Only wrap images that have alt text
      if (alt) {
        $img.attr('loading', 'lazy'); // Add lazy loading
        $img.wrap('<div class="image-container"></div>');
        $img.after(`<div class="image-description">${alt}</div>`);
      }
    });

    return $.html();
  }
};

// Helper function to extract YouTube video ID from various URL formats
function getYouTubeId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Combined extension for both images and YouTube links
const mediaExtension = {
  type: 'output',
  filter: function (text) {
    const $ = cheerio.load(text);

    // Process all img tags
    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      // Check if this is a YouTube link
      const youtubeId = getYouTubeId(src);

      if (youtubeId) {
        // Create YouTube embed
        const iframe = `<iframe 
          src="https://www.youtube-nocookie.com/embed/${youtubeId}?si=8KKqQtmbaypVzWbj&rel=0&playsinline=1"
          title="YouTube video player"
          loading="lazy"
          frameborder="0"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen="">
        </iframe>`.replace(/\s+/g, ' ').trim();

        const $container = $('<div class="image-container"></div>')
          .append(iframe)
          .append(`<div class="image-description">${alt}</div>`);

        $img.replaceWith($container);
      } else if (alt) {
        // Regular image processing
        $img.attr('loading', 'lazy');
        $img.wrap('<div class="image-container"></div>');
        $img.after(`<div class="image-description">${alt}</div>`);
      }
    });

    return $.html();
  }
};

// Code block extension definition
const codeBlockExtension = {
  type: 'output',
  filter: function (text) {
    const $ = cheerio.load(text);

    $('pre code').each((i, block) => {
      // Get the language class if it exists
      const classes = block.attribs.class || '';
      const language = classes.match(/language-(\w+)/)?.[1] || '';

      // Add hljs class and language class
      const existingClasses = $(block).attr('class') || '';
      $(block).attr('class', `${existingClasses} ${language} language-${language} hljs`);

      let highlighted;
      if (language) {
        try {
          highlighted = hljs.highlight($(block).text(), { language }).value;
        } catch (e) {
          highlighted = hljs.highlightAuto($(block).text()).value;
        }
      } else {
        highlighted = hljs.highlightAuto($(block).text()).value;
      }

      $(block).html(highlighted);
    });

    return $.html();
  }
};

// Initialize showdown converter
const converter = new showdown.Converter({
  extensions: [
    shodownKatex(),
    mediaExtension,
    codeBlockExtension
  ]
});

async function convertMarkdownToHtml(markdownFile, templateFile, outputFile, metadata) {
  try {
    // Read markdown and template
    const markdownContent = await fs.readFile(markdownFile, 'utf-8');

    // Convert markdown to HTML
    let htmlContent = converter.makeHtml(markdownContent);

    // Calculate read time
    const wordCount = markdownContent.split(/\s+/).length;
    const readTime = Math.max(1, Math.round(wordCount / 130));


    // Render template with nunjucks
    const finalHtml = nunjucks.render(templateFile, {
      title: metadata.title,
      description: metadata.description,
      current_path: metadata.link,
      date: metadata.date,
      prev_link: metadata.prev_link,
      prev_title: metadata.prev_title,
      next_link: metadata.next_link,
      next_title: metadata.next_title,
      content: htmlContent,
      read_time: `${readTime} min read`,
      socials: metadata.socials || ''
    });

    // Write the final HTML
    await fs.writeFile(outputFile, finalHtml);
  } catch (error) {
    console.error(`Error processing ${markdownFile}:`, error);
    throw error;
  }
}

async function copyDirectory(src, dest) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Error copying directory from ${src} to ${dest}:`, error);
    throw error;
  }
}

async function processInventory(inventory, templateFile, root, outputRoot) {
  try {
    // Process each entry
    for (let i = 0; i < inventory.length; i++) {
      const entry = inventory[i];
      const metadata = {
        ...entry,
        date: dayjs(entry.timestamp * 1000).format('YYYY-MM-DD'),
        prev_link: i > 0 ? inventory[i - 1].link : '#',
        prev_title: i > 0 ? `← ${inventory[i - 1].title}` : '',
        next_link: i < inventory.length - 1 ? inventory[i + 1].link : '#',
        next_title: i < inventory.length - 1 ? `${inventory[i + 1].title} →` : ''
      };

      const inputFolder = path.join(root, entry.link.replace(/^\//, ''));
      const outputFolder = path.join(outputRoot, entry.link.replace(/^\//, ''));
      const markdownFile = path.join(inputFolder, 'index.md');
      const outputFile = path.join(outputFolder, 'index.html');

      // Create output directory and copy files
      await copyDirectory(inputFolder, outputFolder);

      // Convert markdown to HTML
      await convertMarkdownToHtml(markdownFile, templateFile, outputFile, metadata);

      console.log(`Processed: ${entry.title}`, outputFile);
    }
  } catch (error) {
    console.error('Error processing inventory:', error);
    throw error;
  }
}

async function clearDirectory(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await fs.rm(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function generateIndexPage(inventory, templateFile, outputRoot) {
  try {
    // Sort posts by date (newest first)
    const sortedPosts = [...inventory].sort((a, b) => b.timestamp - a.timestamp);

    // Format posts data for the template
    const posts = sortedPosts.map(post => ({
      title: post.title,
      description: post.description,
      date: dayjs(post.timestamp * 1000).format('YYYY-MM-DD'),
      link: post.link,
      thumbnail: `${post.link}img/thumbnail.webp` // Assuming this is your thumbnail path convention
    }));

    // Render template with nunjucks
    const finalHtml = nunjucks.render(templateFile, {
      title: "Pascal Schärli - Cryptography Engineer", // Or make this configurable
      posts: posts
    });

    // Write the index.html file
    const outputFile = path.join(outputRoot, 'index.html');
    await fs.writeFile(outputFile, finalHtml);

    console.log('Generated index page:', outputFile);
  } catch (error) {
    console.error('Error generating index page:', error);
    throw error;
  }
}

async function generateRssFeed(inventory, outputRoot) {
  try {
    // Sort posts by date (newest first)
    const sortedPosts = [...inventory].sort((a, b) => b.timestamp - a.timestamp);

    // Current date in RSS format
    const currentDate = new Date().toUTCString();

    // Build RSS XML content
    let rssContent = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0">
  <channel>
    <title>Pascal Schärli</title>
    <link>https://pascscha.ch</link>
    <description>Hi, I'm Pascal. A cyber security master's graduate from ETH Zürich, now a dedicated Cryptography Engineer with a strong passion for coding and scripting.</description>
    <language>en-us</language>
    <lastBuildDate>${currentDate}</lastBuildDate>

`;

    // Add items
    for (const post of sortedPosts) {
      const pubDate = new Date(post.timestamp * 1000).toUTCString();
      const link = `https://pascscha.ch${post.link}/`;

      rssContent += `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid>${link}</guid>
    </item>
`;
    }

    rssContent += `  </channel>
</rss>`;

    // Create weblog directory if it doesn't exist
    const weblogDir = path.join(outputRoot, 'weblog');
    await fs.mkdir(weblogDir, { recursive: true });

    // Write the RSS file
    const outputFile = path.join(weblogDir, 'rss');
    await fs.writeFile(outputFile, rssContent);

    console.log('Generated RSS feed:', outputFile);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    throw error;
  }
}

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
async function main() {
  program
    .option('-r, --root <path>', 'Root directory of the blog', 'weblog/dynamic')
    .option('-t, --templates <path>', 'Templates directory', 'weblog/templates')
    .option('-o, --output <path>', 'Output directory for HTML files', 'weblog/html')
    .parse(process.argv);

  const options = program.opts();


  try {
    console.log('Copy static files');

    // Clear output directory
    await clearDirectory(options.output);
    await fs.mkdir(options.output, { recursive: true });

    // Copy static files
    const staticDir = 'weblog/static';
    const staticFiles = await fs.readdir(staticDir, { withFileTypes: true });

    for (const file of staticFiles) {
      const src = path.join(staticDir, file.name);
      const dest = path.join(options.output, file.name);

      if (file.isDirectory()) {
        await copyDirectory(src, dest);
      } else {
        await fs.copyFile(src, dest);
      }
    }

    // Process inventory
    const inventoryFile = path.join(options.root, 'inventory.json');
    const postTemplateFile = path.join(options.templates, 'weblog_post.html.njk');
    const indexTemplateFile = path.join(options.templates, 'weblog_index.html.njk');

    const inventory = JSON.parse(await fs.readFile(inventoryFile, 'utf-8'));

    // Generate individual posts
    await processInventory(inventory, postTemplateFile, options.root, options.output);

    // Generate index page
    await generateIndexPage(inventory, indexTemplateFile, options.output);

    // Generate RSS feed
    await generateRssFeed(inventory, options.output);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();