"""
DOCX metadata extractor using python-docx.
Extracts: created, modified, last_printed, author, last_modified_by, revision.
"""

import os
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from docx import Document


CORE_NS = {
    "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
    "dc": "http://purl.org/dc/elements/1.1/",
    "dcterms": "http://purl.org/dc/terms/",
}


def _parse_iso_datetime(value):
    if not value:
        return None

    text = str(value).strip()
    if not text:
        return None

    try:
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _prop_value(props, attr):
    value = getattr(props, attr, None)
    if isinstance(value, datetime):
        return value
    return value or None


def _read_core_properties_from_zip(file_path):
    with zipfile.ZipFile(file_path) as package:
        with package.open("docProps/core.xml") as core_file:
            root = ET.fromstring(core_file.read())

    def text(path):
      node = root.find(path, CORE_NS)
      return node.text.strip() if node is not None and node.text else None

    return {
        "created": _parse_iso_datetime(text("dcterms:created")),
        "modified": _parse_iso_datetime(text("dcterms:modified")),
        "last_printed": _parse_iso_datetime(text("cp:lastPrinted")),
        "author": text("dc:creator"),
        "last_modified_by": text("cp:lastModifiedBy"),
        "revision": text("cp:revision"),
        "salvaged": True,
    }


def _read_core_properties(file_path):
    try:
        props = Document(file_path).core_properties
        return {
            "created": _prop_value(props, "created"),
            "modified": _prop_value(props, "modified"),
            "last_printed": _prop_value(props, "last_printed"),
            "author": _prop_value(props, "author"),
            "last_modified_by": _prop_value(props, "last_modified_by"),
            "revision": _prop_value(props, "revision"),
            "salvaged": False,
        }
    except Exception:
        return _read_core_properties_from_zip(file_path)


def _date_to_iso(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


def _same_person(left, right):
    return str(left or "").strip().casefold() == str(right or "").strip().casefold()


def extract_docx(file_path):
    events = []
    props = _read_core_properties(file_path)
    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)
    source_prefix = "docProps/core.xml" if props.get("salvaged") else "core_properties"

    # Created date
    if props.get("created"):
        events.append({
            "timestamp": _date_to_iso(props["created"]),
            "original_timestamp": str(props["created"]),
            "event_type": "file_created",
            "title": "Document Created",
            "description": f"DOCX document was created",
            "metadata": {"source_property": f"{source_prefix}.created", "salvaged": props.get("salvaged", False)},
            "confidence": 90,
            "tags": ["docx", "creation"]
        })

    # Modified date
    if props.get("modified"):
        events.append({
            "timestamp": _date_to_iso(props["modified"]),
            "original_timestamp": str(props["modified"]),
            "event_type": "file_modified",
            "title": "Document Modified",
            "description": f"DOCX document was last modified",
            "metadata": {"source_property": f"{source_prefix}.modified", "salvaged": props.get("salvaged", False)},
            "confidence": 90,
            "tags": ["docx", "modification"]
        })

    # Last printed
    if props.get("last_printed"):
        events.append({
            "timestamp": _date_to_iso(props["last_printed"]),
            "original_timestamp": str(props["last_printed"]),
            "event_type": "file_printed",
            "title": "Document Printed",
            "description": f"DOCX document was last printed",
            "metadata": {"source_property": f"{source_prefix}.last_printed", "salvaged": props.get("salvaged", False)},
            "confidence": 85,
            "tags": ["docx", "print"]
        })

    author = props.get("author")
    last_modified_by = props.get("last_modified_by")

    # Author info. If author and last-modified-by are the same person, keep one
    # timeline event and record both properties in metadata to avoid duplicates.
    if author and last_modified_by and _same_person(author, last_modified_by):
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": author,
            "event_type": "author_info",
            "title": f"Author: {author}",
            "description": f"Document author and last modified by are both '{author}'",
            "metadata": {
                "author": author,
                "last_modified_by": last_modified_by,
                "source_property": f"{source_prefix}.author,last_modified_by",
                "deduplicated": True,
                "salvaged": props.get("salvaged", False),
            },
            "confidence": 50,
            "tags": ["docx", "author"]
        })
    elif author:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": author,
            "event_type": "author_info",
            "title": f"Author: {author}",
            "description": f"Document author identified as '{author}'",
            "metadata": {"author": author, "source_property": f"{source_prefix}.author", "salvaged": props.get("salvaged", False)},
            "confidence": 50,
            "tags": ["docx", "author"]
        })

    # Last modified by
    if last_modified_by and not (author and _same_person(author, last_modified_by)):
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": last_modified_by,
            "event_type": "author_info",
            "title": f"Last Modified By: {last_modified_by}",
            "description": f"Document last modified by '{last_modified_by}'",
            "metadata": {"last_modified_by": last_modified_by, "source_property": f"{source_prefix}.last_modified_by", "salvaged": props.get("salvaged", False)},
            "confidence": 50,
            "tags": ["docx", "author"]
        })

    # Revision number
    if props.get("revision") is not None:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(props["revision"]),
            "event_type": "document_property",
            "title": f"Revision #{props['revision']}",
            "description": f"Document has {props['revision']} revision(s)",
            "metadata": {"revision": props["revision"], "source_property": f"{source_prefix}.revision", "salvaged": props.get("salvaged", False)},
            "confidence": 50,
            "tags": ["docx", "revision"]
        })

    if props.get("salvaged"):
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": "corrupt_docx_salvage",
            "event_type": "document_property",
            "title": "DOCX Metadata Salvaged",
            "description": "DOCX package has a damaged part, but core document metadata was extracted from docProps/core.xml",
            "metadata": {"source_property": "docProps/core.xml", "salvaged": True},
            "confidence": 70,
            "tags": ["docx", "salvage", "corrupt"]
        })

    return events
