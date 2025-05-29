# Static Site Generator for Personal Weblog

A lightweight, markdown-based static site generator designed to transform technical writing into performance-optimized websites. Developed to create my [personal website](https://schaerli.org) with cryptography-focused features.

## Key Features

- **Markdown Processing Pipeline**:
  - KaTeX math expressions support
  - Lazy-loaded images with responsive captions
  - YouTube URL → embedded player conversion
  - Syntax highlighting with Highlight.js
  - Automatic read-time calculation

- **Optimization Tools**:
  - HTML/CSS/JS minification with source maps
  - Unminified versions with attribution
  - PDF → GitHub Pages redirect system

- **Publishing Automation**:
  - RSS feed generation
  - XML sitemap creation
  - Pagination support
  - Directory-aware templating

## Project Structure
```
weblog/
├── dynamic/           # Source content (Markdown, assets)
├── html/              # Generated HTML output
├── static/            # Static assets (CSS, JS, images)
└── templates/         # Nunjucks templates
```

### Deployment
Docker Compose configuration included:
```yaml
services:
  markdown-renderer:
    build: .
    volumes:
      - .:/app/weblog
    command: ["node", "weblog/index.js"]
```

## Customization Guide

### Creating New Content
1. Add Markdown file: `dynamic/weblog/new-post/index.md`
2. Update metadata: `dynamic/inventory.json`
```json
{
  "title": "Post Title",
  "description": "Brief summary",
  "link": "/weblog/new-post/",
  "timestamp": 1700000000
}
```

### Modifying Templates
Edit Nunjucks files in `templates/`:
- `page.html.njk` - Basic page layout
- `weblog_index.html.njk` - Blog listings
- `weblog_post.html.njk` - Post detail view

## License
GPLv3 - See [LICENSE](LICENSE) file for details.