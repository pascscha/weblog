const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
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
const beautifyHtml = require('js-beautify').html;

const LICENSE_SUFFIX = '\n---\n\n> License: CC BY 4.0. To view a copy of this license, visit <https://creativecommons.org/licenses/by/4.0/>\n';

// Add this utility function to create unminified copies
const createUnminifiedCopy = async (filePath, content) => {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const unminifiedPath = path.join(dir, `${basename}.unminified${ext}`);

  if (ext === '.html') {
    content = beautifyHtml(content, { indent_size: 2, wrap_line_length: 0, preserve_newlines: true });
  }

  await fs.writeFile(unminifiedPath, content);

  // Calculate relative path from output directory
  const relativePath = path.relative('html', unminifiedPath); // Use options.output
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

      if (fullPath.startsWith("html/info")) continue;
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
              processScripts: ['application/ld+json'],
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

// Socials marker replacement
function replaceSocialsMarker(html, socials, templateFile) {
  if (!socials) return html;

  const $ = cheerio.load(html, {}, false);

  const socialsElements = $('socials');
  if (socialsElements.length === 0) return html;

  const entries = Object.entries(socials).filter(([_, url]) => url);
  if (entries.length === 0) {
    socialsElements.remove();
    return $.html();
  }

  const socialsTemplate = path.join(path.dirname(templateFile), 'socials_cta.njk');
  const ctaHtml = nunjucks.render(socialsTemplate, { socials });

  socialsElements.replaceWith(ctaHtml);
  return $.html();
}

// Inject post date as a split-line after the first H1
function injectPostDate(html, date) {
  if (!date) return html;

  const $ = cheerio.load(html, {}, false);

  const h1 = $('h1').first();
  if (h1.length === 0) return html;

  const dateLine = `<div class="post-date-line"><span class="line"></span><span class="post-date">${date}</span><span class="line"></span></div>`;
  h1.after(dateLine);

  return $.html();
}

// Combined extension for media files
const mediaExtension = {
  type: 'output',
  filter: function (text) {
    const $ = cheerio.load(text, {}, false);

    // Process all img tags
    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      const alt = $img.attr('alt');

      if (src && /\.webm/i.test(src.split('#')[0])) {
        const cleanSrc = src.split('#')[0];
        const isGif = src.includes('#gif');
        const attrs = isGif ? 'autoplay loop muted playsinline' : 'controls playsinline';
        const video = `<video ${attrs} loading="lazy" class="blog-video">
          <source src="${cleanSrc}" type="video/webm">
        </video>`;

        const $container = $('<div class="image-container"></div>')
          .append(video);

        if (alt) {
          $container.append(`<div class="image-description">${alt}</div>`);
        }

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
    const $ = cheerio.load(text, {}, false);

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

    // Replace <socials> markers with social sharing links
    htmlContent = replaceSocialsMarker(htmlContent, context.socials, templateFile);

    // Inject post date as a split-line after the first H1
    htmlContent = injectPostDate(htmlContent, context.date);

    // Render template with nunjucks
    const finalHtml = nunjucks.render(templateFile, {
      ...context,
      content: htmlContent
    });

    // Write the final HTML
    await fs.writeFile(outputFile, finalHtml);
  } catch (error) {
    console.error(`Error processing ${markdownFile}:`, error);
    throw error;
  }
}

async function getSocialPreviewImg(inputFolder) {
  for (const candidate of ['img/social-preview.webp', 'img/banner.webp']) {
    try {
      await fs.access(path.join(inputFolder, candidate));
      return candidate;
    } catch {}
  }
  return '';
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
        current_path: '/' + page.dirName + '/',
        socials: '',
        dirname: page.dirName,
        isPost: false,
        social_preview_img: await getSocialPreviewImg(inputFolder)
      };

      await convertMarkdownToHtml(markdownFile, templateFile, outputFile, context);
      const htmlMdFile = outputFile.replace(/\.html$/, '.html.md');
      await fs.rename(outputFile.replace(/\.html$/, '.md'), htmlMdFile);
      await fs.appendFile(htmlMdFile, LICENSE_SUFFIX);
      console.log(`Processed page: ${page.title}`, outputFile);
    }
  } catch (error) {
    console.error('Error processing pages:', error);
    throw error;
  }
}

async function processPostSubdirs(postContentDir, postOutputDir, currentPath, pageTemplateFile) {
  const entries = await fs.readdir(postContentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subdir = entry.name;
    const subdirInput = path.join(postContentDir, subdir);
    const subdirOutput = path.join(postOutputDir, subdir);
    const subdirMd = path.join(subdirInput, 'index.md');

    let hasIndexMd = false;
    try { await fs.access(subdirMd); hasIndexMd = true; } catch {}

    if (hasIndexMd) {
      const mdContent = await fs.readFile(subdirMd, 'utf-8');
      const title = mdContent.match(/^#\s+(.+)/m)?.[1].trim() || subdir;

      await convertMarkdownToHtml(subdirMd, pageTemplateFile, path.join(subdirOutput, 'index.html'), {
        title,
        description: title,
        current_path: currentPath + subdir + '/',
        socials: '',
        dirname: subdir,
        isPost: false,
        social_preview_img: await getSocialPreviewImg(subdirInput)
      });

      const htmlMdFile = path.join(subdirOutput, 'index.html.md');
      await fs.rename(path.join(subdirOutput, 'index.md'), htmlMdFile);
      await fs.appendFile(htmlMdFile, LICENSE_SUFFIX);

      console.log(`  Processed sub-page: ${title} → ${subdirOutput}`);
    }

    await processPostSubdirs(subdirInput, subdirOutput, currentPath + subdir + '/', pageTemplateFile);
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

async function processInventory(inventory, templateFile, root, outputRoot, pageTemplateFile, extraContext = {}) {
  try {
    // Process each entry
    for (let i = 0; i < inventory.length; i++) {
      const entry = inventory[i];
      const metadata = {
        ...entry,
        ...extraContext,
        date: dayjs(entry.timestamp * 1000).format('YYYY-MM-DD'),
        current_path: entry.link,
        social_preview_img: entry.social_preview ? 'img/social-preview.webp' : (entry.has_banner ? 'img/banner.webp' : ''),
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
      const htmlMdFile = outputFile.replace(/\.html$/, '.html.md');
      await fs.rename(outputFile.replace(/\.html$/, '.md'), htmlMdFile);
      await fs.appendFile(htmlMdFile, LICENSE_SUFFIX);

      await processPostSubdirs(inputFolder, outputFolder, entry.link, pageTemplateFile);

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

async function generateIndexPage(categories, templateFile, outputRoot) {
  try {
    // Format entries per category, newest first
    const tabs = categories.map(category => ({
      key: category.key,
      title: category.title,
      description: category.description,
      rssPath: `${category.path}/rss`,
      items: [...category.publishable].sort((a, b) => b.timestamp - a.timestamp).map(entry => ({
        title: entry.title,
        description: entry.description,
        date: dayjs(entry.timestamp * 1000).format('YYYY-MM-DD'),
        link: entry.link,
        thumbnail: `${entry.link}img/thumbnail.webp` // Assuming this is your thumbnail path convention
      }))
    }));

    // Render template with nunjucks
    const finalHtml = nunjucks.render(templateFile, {
      title: "Pascal Schärli",
      current_path: "/",
      tabs: tabs
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

async function generateRssFeed(inventory, outputRoot, feedPath, feedTitle) {
  try {
    // Sort posts by date (newest first)
    const sortedPosts = [...inventory].sort((a, b) => b.timestamp - a.timestamp);

    // Current date in RSS format
    const currentDate = new Date().toUTCString();

    // Build RSS XML content
    let rssContent = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>https://schaerli.org</link>
    <description>Hi, I'm Pascal. A cyber security master's graduate from ETH Zürich, now a dedicated Cryptography Engineer with a strong passion for coding and scripting.</description>
    <language>en-us</language>
    <lastBuildDate>${currentDate}</lastBuildDate>

`;

    // Add items
    for (const post of sortedPosts) {
      const pubDate = new Date(post.timestamp * 1000).toUTCString();
      const link = `https://schaerli.org${post.link}`;

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

    // Create feed directory if it doesn't exist
    const feedDir = path.dirname(path.join(outputRoot, feedPath));
    await fs.mkdir(feedDir, { recursive: true });

    // Write the RSS file
    const outputFile = path.join(outputRoot, feedPath);
    await fs.writeFile(outputFile, rssContent);

    console.log('Generated RSS feed:', outputFile);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    throw error;
  }
}

// Build a redirect page that forwards to targetUrl (used for shortlinks and moved entries)
function buildRedirectHtml(title, description, targetUrl, imageUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
  <link rel="canonical" href="https://schaerli.org${targetUrl}" />
  <title>${escapeXml(title)}</title>
  <meta property="og:title" content="${escapeXml(title)}">
  <meta property="og:description" content="${escapeXml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="https://schaerli.org${targetUrl}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <style>body{background:#242424;color:#DCD8D0;font-family:system-ui,sans-serif;padding:2rem;text-align:center;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0}a{color:#5A9BE1}p{max-width:30em}</style>
</head>
<body>
  <p>Redirecting to <a href="${targetUrl}">${escapeXml(title)}</a></p>
</body>
</html>`.trim();
}

// Add this function to generate redirect pages
async function generateRedirects(inventory, outputRoot, redirectPrefix = '') {
  try {
    console.log('Generating redirect pages...');

    for (const post of inventory) {
      // Extract the numeric ID from the link (e.g. "1" from "/weblog/1-study-materials/" or "/briefs/1-signal/")
      const idMatch = post.link.match(/^\/[^/]+\/(\d+)/);
      if (!idMatch || !idMatch[1]) continue;

      const id = redirectPrefix ? `${redirectPrefix}-${idMatch[1]}` : idMatch[1];
      const redirectDir = path.join(outputRoot, id);
      await fs.mkdir(redirectDir, { recursive: true });

      const redirectPath = path.join(redirectDir, 'index.html');
      const socialPreviewImg = post.social_preview ? `${post.link}img/social-preview.webp`
        : post.has_banner ? `${post.link}img/banner.webp`
        : '/img/social-preview.webp';
      const targetUrl = post.redirect || post.link;
      const htmlContent = buildRedirectHtml(post.title, post.description, targetUrl, `https://schaerli.org${socialPreviewImg}`);

      await fs.writeFile(redirectPath, htmlContent);
      console.log(`Created redirect for ${id} → ${targetUrl}`);
    }
  } catch (error) {
    console.error('Error generating redirects:', error);
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

async function generateSitemap(inventory, outputRoot, sitemapPath) {
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

    // Create sitemap directory if it doesn't exist
    const sitemapDir = path.dirname(path.join(outputRoot, sitemapPath));
    await fs.mkdir(sitemapDir, { recursive: true });

    // Write the sitemap file
    const outputFile = path.join(outputRoot, sitemapPath);
    await fs.writeFile(outputFile, sitemapContent);

    console.log('Generated sitemap:', outputFile);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

// Generate the sitemap index that references the main and per-category sitemaps
async function generateSitemapIndex(categories, outputRoot) {
  try {
    const allEntries = categories.flatMap(category => category.publishable);
    const sortedEntries = [...allEntries].sort((a, b) => b.timestamp - a.timestamp);
    const latestPostDate = sortedEntries.length > 0
      ? dayjs(sortedEntries[0].timestamp * 1000).format('YYYY-MM-DD')
      : dayjs().format('YYYY-MM-DD');
    const buildDate = dayjs().format('YYYY-MM-DD');

    let categoryEntries = '';
    for (const category of categories) {
      categoryEntries += `    <sitemap>
        <loc>https://schaerli.org/${category.path}/sitemap.xml</loc>
        <lastmod>${latestPostDate}</lastmod>
    </sitemap>
`;
    }

    let content = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>https://schaerli.org/sitemap-main.xml</loc>
        <lastmod>${buildDate}</lastmod>
    </sitemap>
${categoryEntries}</sitemapindex>`;

    const outputFile = path.join(outputRoot, 'sitemap.xml');
    await fs.writeFile(outputFile, content);
    console.log('Generated sitemap index:', outputFile);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    throw error;
  }
}

// Generate llms.txt for AI content discovery
async function generateLlmsTxt(categories, outputRoot) {
  try {
    const siteUrl = 'https://schaerli.org';

    let content = `# schaerli.org

> Pascal Schärli's blog about cryptography, security, and privacy.
> Cryptography Engineer at ELCASecurity, ETH Zürich alumni.

## Content

For your convenience, all blog posts are available as clean .md files below.
The content uses a permissive [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
license - you are free to copy and redistribute the material in any medium or format
for any purpose, even commercially. Just make sure to link back to https://schaerli.org
when you do so.
`;

    for (const category of categories) {
      const sortedEntries = [...category.publishable].sort((a, b) => b.timestamp - a.timestamp);
      if (sortedEntries.length === 0) continue;

      content += `\n## ${category.title}\n\n`;
      for (const entry of sortedEntries) {
        const url = `${siteUrl}${entry.link}index.html.md`;
        content += `- [${entry.title}](${url}): ${entry.description}\n`;
      }
    }

    content += `\n## Source Code

The code to build the website is open-source at https://github.com/pascscha/weblog
`;

    const outputFile = path.join(outputRoot, 'llms.txt');
    await fs.writeFile(outputFile, content);
    console.log('Generated llms.txt:', outputFile);
  } catch (error) {
    console.error('Error generating llms.txt:', error);
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
          githubPath = `https://media.githubusercontent.com/media/pascscha/weblog/refs/heads/main/content/${relativePath}`;
        } else {
          githubPath = `https://media.githubusercontent.com/media/pascscha/weblog/refs/heads/main/static/${relativePath}`;
        }

        // Create HTML redirect content
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="refresh" content="0; url=${githubPath}">
  <style>body{background:#242424;color:#DCD8D0;font-family:system-ui,sans-serif;padding:2rem;text-align:center;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0}a{color:#5A9BE1}p{max-width:30em}</style>
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
    .option('-r, --root <path>', 'Root directory of the blog', 'content')
    .option('-t, --templates <path>', 'Templates directory', 'templates')
    .option('-o, --output <path>', 'Output directory for HTML files', 'html')
    .parse(process.argv);

  const options = program.opts();

  // Load .env file if it exists (relative to script location)
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fsSync.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (e) {
    // .env file not found, skip
  }

  const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';


  try {
    console.log('Copy static files');

    // Clear output directory
    await clearDirectory(options.output);
    await fs.mkdir(options.output, { recursive: true });

    // Copy static files
    const staticDir = 'static';
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
    const briefTemplateFile = path.join(options.templates, 'brief_post.html.njk');
    const indexTemplateFile = path.join(options.templates, 'weblog_index.html.njk');
    const pageTemplateFile = path.join(options.templates, 'page.html.njk');

    const { post: posts, page: pages, briefs: briefs = [], categories: categoryConfig = {} } = JSON.parse(await fs.readFile(inventoryFile, 'utf-8'));

    // Category definitions: template and extras live in code, labels/paths come from inventory.json
    const categoryDefs = [
      { key: 'post', entries: posts, templateFile: postTemplateFile, showsRecentPosts: false },
      { key: 'briefs', entries: briefs, templateFile: briefTemplateFile, showsRecentPosts: true }
    ];

    // Separate future/draft entries from current ones, per category
    const now = Date.now();
    const splitByVisibility = entries => ({
      current: entries.filter(p => p.timestamp * 1000 <= now && !p.draft),
      future: entries.filter(p => p.timestamp * 1000 > now || p.draft)
    });

    const categories = categoryDefs.map(def => {
      const cfg = categoryConfig[def.key] || {};
      const { current, future } = splitByVisibility(def.entries);
      return {
        key: def.key,
        entries: def.entries,
        templateFile: def.templateFile,
        showsRecentPosts: def.showsRecentPosts,
        title: cfg.title || def.key,
        description: cfg.description || '',
        path: cfg.path || def.key,
        redirectPrefix: cfg.redirectPrefix,
        rssTitle: cfg.rssTitle || 'Pascal Schärli',
        current,
        future
      };
    });

    // Enrich entries with social preview / banner flags
    for (const category of categories) {
      for (const entry of category.entries) {
        const postDir = path.join(options.root, entry.link.replace(/^\//, ''));
        entry.social_preview = fsSync.existsSync(path.join(postDir, 'img', 'social-preview.webp'));
        entry.has_banner = fsSync.existsSync(path.join(postDir, 'img', 'banner.webp'));
      }
    }

    // Split off redirect stubs, which only keep an old URL alive and are excluded from feeds and listings
    for (const category of categories) {
      category.redirects = category.current.filter(e => e.redirect);
      category.publishable = category.current.filter(e => !e.redirect);
    }

    // The three most recent long-form posts, shown at the bottom of briefs
    const postCategory = categories.find(c => c.key === 'post');
    const recentPosts = [...postCategory.publishable].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3).map(post => ({
      title: post.title,
      description: post.description,
      date: dayjs(post.timestamp * 1000).format('YYYY-MM-DD'),
      link: post.link,
      thumbnail: `${post.link}img/thumbnail.webp`
    }));

    const extraContextFor = category => category.showsRecentPosts
      ? { recent_posts: recentPosts, rss_path: `${category.path}/rss`, rss_title: category.rssTitle }
      : {};

    // Generate individual entries (current only)
    for (const category of categories) {
      await processInventory(category.publishable, category.templateFile, options.root, options.output, pageTemplateFile, extraContextFor(category));
    }

    // Keep the old URLs of moved entries alive as redirect pages
    for (const category of categories) {
      for (const entry of category.redirects) {
        const outputFolder = path.join(options.output, entry.link.replace(/^\//, ''));
        await fs.mkdir(outputFolder, { recursive: true });
        const imageUrl = entry.social_preview ? `https://schaerli.org${entry.link}img/social-preview.webp`
          : entry.has_banner ? `https://schaerli.org${entry.link}img/banner.webp`
          : 'https://schaerli.org/img/social-preview.webp';
        await fs.writeFile(path.join(outputFolder, 'index.html'), buildRedirectHtml(entry.title, entry.description, entry.redirect, imageUrl));
        console.log(`Generated redirect: ${entry.link} → ${entry.redirect}`);
      }
    }

    // Process future/draft entries as previews
    const futureEntries = categories.flatMap(category =>
      category.future.map(entry => ({ entry, category }))
    );
    if (futureEntries.length > 0) {
      if (!PREVIEW_SECRET) {
        console.warn('Warning: future posts found but no PREVIEW_SECRET set in .env. Skipping preview rendering.');
      } else {
        console.log(`Processing ${futureEntries.length} future entr(y/ies) as previews...`);
        for (const { entry, category } of futureEntries) {
          const hmac = crypto.createHmac('sha256', PREVIEW_SECRET).update(entry.link).digest('hex');
          const previewPath = `preview/${hmac}/`;
          const outputFolder = path.join(options.output, previewPath);

          // Find index in full category list for prev/next context
          const fullIdx = category.entries.findIndex(e => e.link === entry.link);
          const metadata = {
            ...entry,
            ...extraContextFor(category),
            date: dayjs(entry.timestamp * 1000).format('YYYY-MM-DD'),
            current_path: `/${previewPath}`,
            preview: true,
            social_preview_img: entry.social_preview ? 'img/social-preview.webp' : (entry.has_banner ? 'img/banner.webp' : ''),
            prev_link: fullIdx > 0 ? category.entries[fullIdx - 1].link : '#',
            prev_title: fullIdx > 0 ? `← ${category.entries[fullIdx - 1].title}` : '',
            next_link: fullIdx < category.entries.length - 1 ? category.entries[fullIdx + 1].link : '#',
            next_title: fullIdx < category.entries.length - 1 ? `${category.entries[fullIdx + 1].title} →` : '',
          };

          const inputFolder = path.join(options.root, entry.link.replace(/^\//, ''));
          const markdownFile = path.join(inputFolder, 'index.md');
          const outputFile = path.join(outputFolder, 'index.html');

          await copyDirectory(inputFolder, outputFolder);
          await convertMarkdownToHtml(markdownFile, category.templateFile, outputFile, metadata);
          const htmlMdFile = outputFile.replace(/\.html$/, '.html.md');
          await fs.rename(outputFile.replace(/\.html$/, '.md'), htmlMdFile);
          await fs.appendFile(htmlMdFile, LICENSE_SUFFIX);

          await processPostSubdirs(inputFolder, outputFolder, `/${previewPath}`, pageTemplateFile);

          console.log(`Processed preview: ${entry.title} → /${previewPath}`);
        }

      }
    }

    // Process static pages (privacy policy, error pages, etc)
    await processPages(pages, options.root, options.output, pageTemplateFile);

    // Generate public pages from current entries only (future ones hidden)
    for (const category of categories) {
      await generateRssFeed(category.publishable, options.output, `${category.path}/rss`, category.rssTitle);
      await generateSitemap(category.publishable, options.output, `${category.path}/sitemap.xml`);
      // Categories without a redirectPrefix get no shortlink redirects
      if (category.redirectPrefix !== undefined) {
        await generateRedirects(category.current, options.output, category.redirectPrefix);
      }
    }
    await generateIndexPage(categories, indexTemplateFile, options.output);
    await generateSitemapIndex(categories, options.output);
    await generateLlmsTxt(categories, options.output);

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