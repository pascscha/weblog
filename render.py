import markdown
import json
from bs4 import BeautifulSoup
import argparse
import os
from datetime import datetime


def convert_markdown_to_html(markdown_file, template_file, output_file, metadata):
    # Read the Markdown content
    with open(markdown_file, "r", encoding="utf-8") as f:
        markdown_content = f.read()

    # Convert Markdown to HTML
    html_content = markdown.markdown(
        markdown_content, extensions=["extra", "codehilite"]
    )

    # Read the HTML template
    with open(template_file, "r", encoding="utf-8") as f:
        template = f.read()

    # Replace placeholders in template
    template = template.replace("<!-- TITLE_PLACEHOLDER -->", metadata["title"])
    template = template.replace(
        "<!-- DESCRIPTION_PLACEHOLDER -->", metadata["description"]
    )
    template = template.replace("<!-- CURRENT_PATH_PLACEHOLDER -->", metadata["link"])
    template = template.replace("<!-- DATE_PLACEHOLDER -->", metadata["date"])
    template = template.replace("<!-- PREV_LINK_PLACEHOLDER -->", metadata["prev_link"])
    template = template.replace(
        "<!-- PREV_TITLE_PLACEHOLDER -->", metadata["prev_title"]
    )
    template = template.replace("<!-- NEXT_LINK_PLACEHOLDER -->", metadata["next_link"])
    template = template.replace(
        "<!-- NEXT_TITLE_PLACEHOLDER -->", metadata["next_title"]
    )
    template = template.replace("<!-- CONTENT_PLACEHOLDER -->", html_content)

    # Parse the HTML to add IDs to headers and generate TOC
    soup = BeautifulSoup(template, "html.parser")
    toc = generate_toc(soup)

    # Insert TOC into the document
    toc_placeholder = soup.find(id="toc")
    if toc_placeholder:
        toc_placeholder.append(toc)

    # Calculate read time
    word_count = len(markdown_content.split())
    read_time = max(1, round(word_count / 200))
    read_time_span = soup.find(id="read-time")
    if read_time_span:
        read_time_span.string = f"{read_time} min read"

    # Write the final HTML to file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(str(soup))


def generate_toc(soup):
    toc = soup.new_tag("ul")
    headers = soup.find_all(["h1", "h2", "h3"])

    for i, header in enumerate(headers):
        if not header.get("id"):
            header["id"] = f"heading-{i}"

        li = soup.new_tag("li")
        a = soup.new_tag("a", href=f'#{header["id"]}')
        a.string = header.text
        li.append(a)

        if header.name == "h2":
            li["style"] = "margin-left: 20px;"
        elif header.name == "h3":
            li["style"] = "margin-left: 40px;"

        toc.append(li)

    return toc


def process_inventory(inventory_file, template_file, root, output_root):
    # Read the inventory
    with open(inventory_file, "r", encoding="utf-8") as f:
        inventory = json.load(f)

    # Process each entry
    for i, entry in enumerate(inventory):
        # Set up metadata
        metadata = entry.copy()
        metadata["date"] = datetime.fromtimestamp(entry["timestamp"]).strftime(
            "%Y-%m-%d"
        )

        # Set up previous and next links
        if i > 0:
            metadata["prev_link"] = inventory[i - 1]["link"]
            metadata["prev_title"] = f"← {inventory[i-1]['title']}"
        else:
            metadata["prev_link"] = "#"
            metadata["prev_title"] = ""

        if i < len(inventory) - 1:
            metadata["next_link"] = inventory[i + 1]["link"]
            metadata["next_title"] = f"{inventory[i+1]['title']} →"
        else:
            metadata["next_link"] = "#"
            metadata["next_title"] = ""

        # Set up input and output file paths
        markdown_file = os.path.join(root, entry["link"].lstrip("/"), "index.md")
        output_file = os.path.join(output_root, entry["link"].lstrip("/"), "index.html")

        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        # Convert markdown to HTML
        convert_markdown_to_html(markdown_file, template_file, output_file, metadata)

        print(f"Processed: {entry['title']}", output_file)


def main():
    parser = argparse.ArgumentParser(
        description="Convert Markdown blog posts to HTML using an inventory file."
    )
    parser.add_argument(
        "-r", "--root", default="dynamic", help="Root directory of the blog"
    )
    parser.add_argument(
        "-t",
        "--templates",
        default="templates",
        help="Root directory of the blog",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="html",
        help="Output directory for HTML files (default: same as input)",
    )

    args = parser.parse_args()

    root = args.root
    inventory_file = os.path.join(root, "inventory.json")
    template_file = os.path.join(args.templates, "template.html")

    output_root = args.output if args.output else root

    if not os.path.exists(inventory_file):
        print(f"Error: Inventory file not found: {inventory_file}")
        return

    if not os.path.exists(template_file):
        print(f"Error: Template file not found: {template_file}")
        return

    if not os.path.exists(root):
        print(f"Error: Blog root directory not found: {root}")
        return

    process_inventory(inventory_file, template_file, root, output_root)


if __name__ == "__main__":
    main()
