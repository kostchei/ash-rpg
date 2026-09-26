"""
Extracts full text from Stonetop Book I PDF into structured Markdown.
Uses pymupdf and pymupdf4llm for high-fidelity markdown with headers, tables, and lists.
Multithreaded across CPU cores for maximum performance.
"""

import os
import sys
import time
import argparse
from concurrent.futures import ThreadPoolExecutor
import pymupdf
import pymupdf4llm.helpers.pymupdf_rag as rag

DEFAULT_INPUT_PDF = r"C:\Users\Admin\Desktop\Book_I_-_Stonetop_(1-up)_-_2nd_printing.pdf"
DEFAULT_OUTPUT_MD = r"C:\Users\Admin\Desktop\Book_I_-_Stonetop_(1-up)_-_2nd_printing.md"
DEFAULT_REPO_COPY = r"D:\Code\ash-rpg\sources\Book_I_-_Stonetop.md"

def extract_chunk(pdf_path, page_indices):
    """Worker function: opens PDF independently to avoid thread contention, extracts markdown."""
    doc = pymupdf.open(pdf_path)
    try:
        chunk_text = rag.to_markdown(
            doc,
            pages=page_indices,
            ignore_images=True,
            ignore_graphics=True,
            page_separators=True
        )
        return page_indices[0], chunk_text
    finally:
        doc.close()

def build_toc_markdown(toc):
    """Formats the PDF's Table of Contents into a structured markdown list."""
    lines = ["# Table of Contents\n"]
    for item in toc:
        lvl, title, page = item[0], item[1].strip(), item[2]
        indent = "  " * (lvl - 1)
        lines.append(f"{indent}- **{title}** (Page {page})")
    lines.append("\n---\n")
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Extract Stonetop PDF to Markdown")
    parser.add_argument("--input", "-i", default=DEFAULT_INPUT_PDF, help="Path to input PDF")
    parser.add_argument("--output", "-o", default=DEFAULT_OUTPUT_MD, help="Path to output Markdown file")
    parser.add_argument("--copy", "-c", default=DEFAULT_REPO_COPY, help="Optional secondary output path in repo")
    parser.add_argument("--workers", "-w", type=int, default=8, help="Number of concurrent worker threads")
    parser.add_argument("--chunk-size", type=int, default=15, help="Number of pages per worker chunk")
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output)
    copy_path = os.path.abspath(args.copy) if args.copy else None

    if not os.path.exists(input_path):
        print(f"Error: Input file does not exist: {input_path}")
        sys.exit(1)

    print(f"Opening: {input_path}")
    t0 = time.time()
    main_doc = pymupdf.open(input_path)
    total_pages = len(main_doc)
    toc = main_doc.get_toc()
    meta = main_doc.metadata or {}
    title = meta.get("title") or "Stonetop Book I"
    author = meta.get("author") or "Jeremy Strandberg"
    main_doc.close()

    print(f"Total Pages: {total_pages}")
    print(f"TOC Entries: {len(toc)}")
    print(f"Using {args.workers} worker threads (chunk size: {args.chunk_size})")

    # Group page indices into chunks
    chunks = []
    for start in range(0, total_pages, args.chunk_size):
        end = min(start + args.chunk_size, total_pages)
        chunks.append(list(range(start, end)))

    print(f"Processing {len(chunks)} chunks across {args.workers} threads...")

    extracted_chunks = {}
    completed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(extract_chunk, input_path, chunk): chunk[0] for chunk in chunks}
        for future in futures:
            start_page, text = future.result()
            extracted_chunks[start_page] = text
            completed += 1
            if completed % 5 == 0 or completed == len(chunks):
                pct = (completed / len(chunks)) * 100
                print(f"Progress: {completed}/{len(chunks)} chunks ({pct:.1f}%) in {time.time() - t0:.1f}s")

    print("Assembling final Markdown document...")
    md_header = [
        f"# {title}",
        f"**Author:** {author}",
        f"**Total Pages:** {total_pages}",
        f"**Extracted At:** {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "\n---\n"
    ]
    
    toc_md = build_toc_markdown(toc)

    # Sort and join chunks by original page order
    sorted_starts = sorted(extracted_chunks.keys())
    body_text = "\n\n".join(extracted_chunks[start] for start in sorted_starts)

    full_markdown = "\n".join(md_header) + "\n" + toc_md + "\n\n" + body_text

    # Write primary output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_markdown)
    print(f"Saved primary Markdown file to: {output_path} ({os.path.getsize(output_path):,} bytes)")

    # Write secondary copy if requested
    if copy_path:
        os.makedirs(os.path.dirname(copy_path), exist_ok=True)
        with open(copy_path, "w", encoding="utf-8") as f:
            f.write(full_markdown)
        print(f"Saved copy to repo at: {copy_path} ({os.path.getsize(copy_path):,} bytes)")

    elapsed = time.time() - t0
    print(f"All done! Completed in {elapsed:.1f} seconds ({total_pages / elapsed:.1f} pages/sec)")

if __name__ == "__main__":
    main()
