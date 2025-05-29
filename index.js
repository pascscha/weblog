const fs = require('fs').promises;
const path = require('path');
const showdown = require('showdown');
const shodownKatex = require('showdown-katex');
const cheerio = require('cheerio');
const hljs = require('highlight.js');
const { program } = require('commander');
const dayjs = require('dayjs');
const nunjucks = require('nunjucks');
const htmlMinifier = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const UglifyJS = require('uglify-js');
const sharp = require('sharp');

// Add this utility function to create unminified copies
const createUnminifiedCopy = async (filePath, content) => {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const unminifiedPath = path.join(dir, `${basename}.unminified${ext}`);

  await fs.writeFile(unminifiedPath, content);

  // Calculate relative path from output directory
  const relativePath = path.relative('weblog/html', unminifiedPath); // Use options.output
  return relativePath;
};

// Add this function to minify files and create unminified copies
async function minifyStaticFiles(directory) {
  try {
    const extensions = ['.html', '.css', '.js'];
    const entries = await fs.readdir(directory, { withFileTypes: true, recursive: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const fullPath = path.join(entry.parentPath, entry.name);
      const ext = path.extname(entry.name).toLowerCase();

      if (fullPath.startsWith("weblog/html/info")) continue;
      if (!extensions.includes(ext)) continue;

      console.log("minifying", fullPath)

      try {
        const content = await fs.readFile(fullPath, 'utf8');
        // Create unminified copy and get its name
        const unminifiedFilename = await createUnminifiedCopy(fullPath, content);

        let minified;
        switch (ext) {
          case '.html':
            minified = await htmlMinifier.minify(content, {
              collapseWhitespace: true,
              removeComments: true,
              minifyCSS: true,
              minifyJS: true,
              removeRedundantAttributes: true,
            });
            minified = `<!-- Unminified: https://schaerli.org/${unminifiedFilename} -->\n${minified}`;
            break;
          case '.css':
            minified = new CleanCSS({}).minify(content).styles;
            minified = `/* Unminified: https://schaerli.org/${unminifiedFilename} */\n${minified}`;
            break;
          case '.js':
            const result = UglifyJS.minify(content);
            if (result.error) throw result.error;
            minified = result.code;
            minified = `// Unminified: https://schaerli.org/${unminifiedFilename}\n${minified}`;
            break;
        }

        await fs.writeFile(fullPath, minified);
      } catch (err) {
        console.error(`Error minifying ${fullPath}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in minifyStaticFiles:', err);
  }
}

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

async function convertMarkdownToHtml(markdownFile, templateFile, outputFile, context) {
  try {
    // Read markdown and template
    const markdownContent = await fs.readFile(markdownFile, 'utf-8');

    // Convert markdown to HTML
    let htmlContent = converter.makeHtml(markdownContent);

    // Calculate read time only if needed (for blog posts)
    let readTime = '';
    if (context.hasOwnProperty('isPost') && context.isPost) {
      const wordCount = markdownContent.split(/\s+/).length;
      const readTimeMinutes = Math.max(1, Math.round(wordCount / 150));
      readTime = `${readTimeMinutes} min read`;
    }

    // Render template with nunjucks
    const finalHtml = nunjucks.render(templateFile, {
      ...context,
      content: htmlContent,
      read_time: readTime
    });

    // Write the final HTML
    await fs.writeFile(outputFile, finalHtml);
  } catch (error) {
    console.error(`Error processing ${markdownFile}:`, error);
    throw error;
  }
}

async function processPages(pages, root, outputRoot, templateFile) {
  try {

    for (const page of pages) {
      const inputFolder = path.join(root, page.dirName);
      const outputFolder = path.join(outputRoot, page.dirName);
      const markdownFile = path.join(inputFolder, 'index.md');
      const outputFile = path.join(outputFolder, 'index.html');

      // Ensure output directory exists
      await fs.mkdir(outputFolder, { recursive: true });

      // Copy all files except markdown
      await copyDirectory(inputFolder, outputFolder);

      // Build context for this page
      const context = {
        title: page.title,
        description: page.description,
        current_path: page.dirName,
        socials: '',
        dirname: page.dirName,
        isPost: false
      };

      await convertMarkdownToHtml(markdownFile, templateFile, outputFile, context);
      console.log(`Processed page: ${page.title}`, outputFile);
    }
  } catch (error) {
    console.error('Error processing pages:', error);
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
    <link>https://schaerli.org</link>
    <description>Hi, I'm Pascal. A cyber security master's graduate from ETH Zürich, now a dedicated Cryptography Engineer with a strong passion for coding and scripting.</description>
    <language>en-us</language>
    <lastBuildDate>${currentDate}</lastBuildDate>

`;

    // Add items
    for (const post of sortedPosts) {
      const pubDate = new Date(post.timestamp * 1000).toUTCString();
      const link = `https://schaerli.org${post.link}/`;

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

async function generateSitemap(inventory, outputRoot) {
  try {
    // Sort posts by date (newest first)
    const sortedPosts = [...inventory].sort((a, b) => b.timestamp - a.timestamp);

    // Build sitemap XML content
    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add entries for each post
    for (const post of sortedPosts) {
      const lastmod = dayjs(post.timestamp * 1000).format('YYYY-MM-DD');
      const loc = `https://schaerli.org${post.link}`;

      sitemapContent += `    <url>
        <loc>${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <priority>0.80</priority>
    </url>
`;
    }

    sitemapContent += `</urlset>`;

    // Create weblog directory if it doesn't exist
    const weblogDir = path.join(outputRoot, 'weblog');
    await fs.mkdir(weblogDir, { recursive: true });

    // Write the sitemap file
    const outputFile = path.join(weblogDir, 'sitemap.xml');
    await fs.writeFile(outputFile, sitemapContent);

    console.log('Generated sitemap:', outputFile);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

// Add this new function
async function processPdfFiles(outputDir) {
  const processDirectory = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.name.endsWith('.pdf')) {
        // Get relative path from output directory
        const relativePath = path.relative(outputDir, fullPath);

        // Determine if it's in weblog or not-weblog
        let githubPath;
        if (relativePath.startsWith('weblog/')) {
          githubPath = `https://media.githubusercontent.com/media/pascscha/weblog/refs/heads/main/dynamic/${relativePath}`;
        } else {
          githubPath = `https://media.githubusercontent.com/media/pascscha/weblog/refs/heads/main/static/${relativePath}`;
        }

        // Create HTML redirect content
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=${githubPath}">
</head>
<body>
  <p>Redirecting to <a href="${githubPath}">${githubPath}</a></p>
</body>
</html>`;

        // Delete PDF and create HTML file
        await fs.unlink(fullPath);
        await fs.writeFile(fullPath.replace('.pdf', '.html'), htmlContent);
      }
    }
  };

  await processDirectory(outputDir);
}

// Add this new function to generate favicons
async function generateFavicons(templatePath, outputDirMain, outputDir) {
  try {
    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // List of required sizes from the original files
    const sizes = [
      16, 32, 48, 64, 128, 152, 180, 192, 1024
    ];

    // Generate each size
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `favicon-${size}x${size}.png`);
      await sharp(templatePath)
        .resize(size, size)
        .toFile(outputFile);
    }

    await sharp(templatePath).resize(32, 32).toFile(path.join(outputDirMain, 'favicon.ico'))

    console.log(`Generated favicons in ${outputDir}`);
  } catch (error) {
    console.error('Error generating favicons:', error);
    throw error;
  }
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
    const pageTemplateFile = path.join(options.templates, 'page.html.njk');

    const inventory = JSON.parse(await fs.readFile(inventoryFile, 'utf-8'));

    // Generate individual posts
    await processInventory(inventory, postTemplateFile, options.root, options.output);

    // Process static pages (privacy policy, etc)
    const pages = [
      {
        title: 'Privacy Policy',
        description: 'Privacy policy for schaerli.org',
        dirName: 'privacy'  // Important: matches folder name
      }
    ];

    await processPages(pages, options.root, options.output, pageTemplateFile);

    // Generate index page
    await generateIndexPage(inventory, indexTemplateFile, options.output);

    // Generate RSS feed
    await generateRssFeed(inventory, options.output);

    // Generate sitemap
    await generateSitemap(inventory, options.output);

    // Add this new step at the end
    console.log('Processing PDF files...');
    await processPdfFiles(options.output);

    // Add this after all other processing
    console.log('Minifying static files...');
    await minifyStaticFiles(options.output);

    console.log('Generating favicons from template...');
    const faviconTemplatePath = path.join(options.root, 'img', 'favicon', 'favicon-template.png');
    const faviconOutputDir = path.join(options.output, 'img', 'favicon');
    const faviconOutputDirMain = path.join(options.output);
    await generateFavicons(faviconTemplatePath, faviconOutputDirMain, faviconOutputDir);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();