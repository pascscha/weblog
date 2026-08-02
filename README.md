# Static Site Generator for schaerli.org

A lightweight, markdown-based static site generator designed to transform technical writing into performance-optimized websites. Developed to create my [personal website](https://schaerli.org) with cryptography-focused features.

## Key Features

- **Markdown Processing Pipeline**. KaTeX math expressions, lazy-loaded images with responsive captions, "fake gif" with auto-looping embedded `.webm` videos, syntax highlighting with Highlight.js, and automatic read-time calculation.

- **No external dependencies & private**. Everything is bundled, no requests to CDNs, no cookies, everything works even with JavaScript disabled, every post can be read as index.html.md as pure markdown.

- **Optimization Tools**. HTML, CSS, and JS minification with source maps, unminified copies with attribution links, CSS font-display tuning for faster paint, Font Awesome deferred via preload and swap, PDF to GitHub redirect system, and favicon generation from a template PNG.

- **Publishing Automation**. RSS feed generation, XML sitemap and sitemap index creation, `llms.txt` generation for AI content discovery, short URL redirect pages for blogs, and a draft/preview system with HMAC-signed URLs.

## Project Structure

```plain
weblog/
├── builder/          # Build tool (Dockerfile, build.js, package.json)
├── content/          # Source content (Markdown, images, inventory.json)
├── html/             # Generated output (gitignored)
├── static/           # Static assets (CSS, JS, images, fonts, keys)
└── templates/        # Nunjucks templates
```

## Building

Docker Compose configuration is included.

```yaml
services:
  markdown-renderer:
    build: ./builder
    user: "1000:1000"
    working_dir: /app
    volumes:
      - .:/app
      - /app/builder/node_modules
    environment:
      - NODE_ENV=production
    command: ["node", "builder/build.js"]
```

Run `docker compose up` to generate all static files into `./html/`, which you can then serve with any proxy such as nginx.

## Customization Guide

### Creating New Content

1. Add a Markdown file at `content/weblog/new-post/index.md`
2. Add an entry to `content/inventory.json`

```json
{
  "title": "Post Title",
  "description": "Brief summary",
  "link": "/weblog/new-post/",
  "timestamp": 1700000000
}
```

The `title`, `description`, `link`, and `timestamp` fields are required. Optional fields include `draft` (boolean, hides the post from the index), `socials` (per-post social sharing overrides), `attribution` (banner image credit), and `keywords` (SEO and search terms).

The builder also creates an `index.html.md` copy of each post with a CC BY 4.0 license footer for direct Markdown access. This file is advertised in `llms.txt` and in each post's `<link rel="alternate" type="text/markdown">` tag.

### Drafts and Previews

Posts with a future timestamp or `"draft": true` are excluded from the public index and RSS feed. Instead they are rendered at a preview URL using an HMAC-based path like `/preview/<hmac>/`. These URLs are technically public but practically unguessable unless the link is deliberately shared. This requires a `PREVIEW_SECRET` set in `.env`.

### Modifying Templates

Edit Nunjucks files in `templates/`

- `page.html.njk` - Basic page layout
- `weblog_index.html.njk` - Blog listings
- `weblog_post.html.njk` - Post detail view
- `socials_cta.njk` - Per-post social sharing buttons

## License

This repository uses two licenses.

- **Code** (builder/, templates/, static/, etc.): [GNU GPLv3](./LICENSE-CODE)
- **Content** (content/ blog posts, images, assets): [CC BY 4.0](./LICENSE-CONTENT)
