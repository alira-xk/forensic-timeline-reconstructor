import sys
import json
import os
import re
from datetime import datetime
from PyPDF2 import PdfReader
from PIL import Image
from PIL.ExifTags import TAGS
from docx import Document


def normalize_pdf_date(pdf_date):
    if not pdf_date:
        return None

    try:
        clean_date = str(pdf_date).replace("D:", "")[:14]
        dt = datetime.strptime(clean_date, "%Y%m%d%H%M%S")
        return dt.isoformat() + "Z"
    except Exception:
        return None


def extract_pdf_metadata(file_path):
    events = []

    reader = PdfReader(file_path)
    metadata = reader.metadata

    if not metadata:
        return events

    created = metadata.get("/CreationDate")
    modified = metadata.get("/ModDate")
    author = metadata.get("/Author")
    title = metadata.get("/Title")

    created_iso = normalize_pdf_date(created)
    modified_iso = normalize_pdf_date(modified)

    if created_iso:
        events.append({
            "eventType": "PDF_CREATED",
            "timestamp": created_iso,
            "rawTimestamp": str(created),
            "source": "PDF Metadata",
            "description": f"PDF created. Title: {title or 'N/A'}, Author: {author or 'N/A'}"
        })

    if modified_iso:
        events.append({
            "eventType": "PDF_MODIFIED",
            "timestamp": modified_iso,
            "rawTimestamp": str(modified),
            "source": "PDF Metadata",
            "description": f"PDF modified. Title: {title or 'N/A'}, Author: {author or 'N/A'}"
        })

    return events


def extract_image_metadata(file_path):
    events = []

    image = Image.open(file_path)
    exif_data = image.getexif()

    metadata = {}

    if exif_data:
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            metadata[tag_name] = value

    date_taken = metadata.get("DateTimeOriginal") or metadata.get("DateTime")

    if date_taken:
        try:
            dt = datetime.strptime(str(date_taken), "%Y:%m:%d %H:%M:%S")
            iso_time = dt.isoformat() + "Z"

            camera_make = metadata.get("Make", "N/A")
            camera_model = metadata.get("Model", "N/A")

            events.append({
                "eventType": "IMAGE_CAPTURED",
                "timestamp": iso_time,
                "rawTimestamp": str(date_taken),
                "source": "Image EXIF Metadata",
                "description": f"Image captured. Camera: {camera_make} {camera_model}"
            })

            return events

        except Exception:
            pass

    modified_time = os.path.getmtime(file_path)
    dt = datetime.fromtimestamp(modified_time)

    events.append({
        "eventType": "IMAGE_FILE_MODIFIED",
        "timestamp": dt.isoformat() + "Z",
        "rawTimestamp": str(modified_time),
        "source": "File System Metadata",
        "description": "Image EXIF date not found. Used file modified time from system metadata."
    })

    return events


def extract_docx_metadata(file_path):
    events = []

    document = Document(file_path)
    props = document.core_properties

    if props.created:
        events.append({
            "eventType": "DOCX_CREATED",
            "timestamp": props.created.isoformat() + "Z",
            "rawTimestamp": str(props.created),
            "source": "DOCX Core Properties",
            "description": f"DOCX created. Author: {props.author or 'N/A'}, Title: {props.title or 'N/A'}"
        })

    if props.modified:
        events.append({
            "eventType": "DOCX_MODIFIED",
            "timestamp": props.modified.isoformat() + "Z",
            "rawTimestamp": str(props.modified),
            "source": "DOCX Core Properties",
            "description": f"DOCX modified. Last modified by: {props.last_modified_by or 'N/A'}"
        })

    if not events:
        modified_time = os.path.getmtime(file_path)
        dt = datetime.fromtimestamp(modified_time)

        events.append({
            "eventType": "DOCX_FILE_MODIFIED",
            "timestamp": dt.isoformat() + "Z",
            "rawTimestamp": str(modified_time),
            "source": "File System Metadata",
            "description": "DOCX metadata date not found. Used file modified time from system metadata."
        })

    return events


def extract_log_metadata(file_path):
    events = []

    timestamp_patterns = [
        r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}",
        r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",
        r"\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}",
    ]

    date_formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
    ]

    with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
        lines = file.readlines()

    for line_number, line in enumerate(lines, start=1):
        for pattern in timestamp_patterns:
            match = re.search(pattern, line)

            if match:
                raw_timestamp = match.group()
                parsed_time = None

                for fmt in date_formats:
                    try:
                        parsed_time = datetime.strptime(raw_timestamp, fmt)
                        break
                    except Exception:
                        pass

                if parsed_time:
                    events.append({
                        "eventType": "LOG_EVENT",
                        "timestamp": parsed_time.isoformat() + "Z",
                        "rawTimestamp": raw_timestamp,
                        "source": "Log File",
                        "description": f"Log event found on line {line_number}: {line.strip()[:120]}"
                    })

                break

    if not events:
        modified_time = os.path.getmtime(file_path)
        dt = datetime.fromtimestamp(modified_time)

        events.append({
            "eventType": "LOG_FILE_MODIFIED",
            "timestamp": dt.isoformat() + "Z",
            "rawTimestamp": str(modified_time),
            "source": "File System Metadata",
            "description": "No timestamp found inside log file. Used file modified time from system metadata."
        })

    return events


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python extract.py <filePath> <fileType>"
        }))
        return

    file_path = sys.argv[1]
    file_type = sys.argv[2].upper()

    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError("File not found")

        if file_type == "PDF":
            events = extract_pdf_metadata(file_path)
        elif file_type == "IMAGE":
            events = extract_image_metadata(file_path)
        elif file_type == "DOCX":
            events = extract_docx_metadata(file_path)
        elif file_type == "LOG":
            events = extract_log_metadata(file_path)
        else:
            events = []

        print(json.dumps({
            "success": True,
            "events": events
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))


if __name__ == "__main__":
    main()