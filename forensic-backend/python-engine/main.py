#!/usr/bin/env python3
"""
Forensic Timeline Reconstructor — Python Extraction Engine
Called via: python main.py --file <path> --type <docx|pdf|image|log> --file-id <id> --case-id <id>
Outputs JSON to stdout, always exits 0.
"""

import argparse
import json
import sys
import os
import traceback

from extractors import extract_docx, extract_pdf, extract_image, extract_log


def main():
    parser = argparse.ArgumentParser(description='Forensic metadata extraction engine')
    parser.add_argument('--file', required=True, help='Path to the file to extract')
    parser.add_argument('--type', required=True, choices=['docx', 'pdf', 'image', 'log', 'txt'],
                        help='File type')
    parser.add_argument('--file-id', required=True, help='Database file record ID')
    parser.add_argument('--case-id', required=True, help='Database case ID')

    args = parser.parse_args()

    if not os.path.exists(args.file):
        output = {
            "success": False,
            "error": f"File not found: {args.file}",
            "events": [],
            "file_id": args.file_id,
            "case_id": args.case_id
        }
        print(json.dumps(output))
        sys.exit(0)

    try:
        file_type = args.type
        extractors = {
            'docx': extract_docx,
            'pdf': extract_pdf,
            'image': extract_image,
            'log': extract_log,
            'txt': extract_log,  # Treat txt as log
        }

        extractor = extractors.get(file_type)
        if not extractor:
            output = {
                "success": False,
                "error": f"Unsupported file type: {file_type}",
                "events": [],
                "file_id": args.file_id,
                "case_id": args.case_id
            }
            print(json.dumps(output))
            sys.exit(0)

        events = extractor(args.file)

        output = {
            "success": True,
            "events": events,
            "file_id": args.file_id,
            "case_id": args.case_id,
            "total_events": len(events)
        }
        print(json.dumps(output, default=str))
        sys.exit(0)

    except Exception as e:
        output = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "events": [],
            "file_id": args.file_id,
            "case_id": args.case_id
        }
        print(json.dumps(output))
        sys.exit(0)


if __name__ == '__main__':
    main()
