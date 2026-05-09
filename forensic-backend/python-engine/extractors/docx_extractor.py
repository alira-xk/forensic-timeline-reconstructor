"""
DOCX metadata extractor using python-docx.
Extracts: created, modified, last_printed, author, last_modified_by, revision.
"""

import os
from datetime import datetime, timezone
from docx import Document


def extract_docx(file_path):
    events = []
    doc = Document(file_path)
    props = doc.core_properties
    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)

    # Created date
    if props.created:
        events.append({
            "timestamp": props.created.isoformat() if hasattr(props.created, 'isoformat') else str(props.created),
            "original_timestamp": str(props.created),
            "event_type": "file_created",
            "title": "Document Created",
            "description": f"DOCX document was created",
            "metadata": {"source_property": "core_properties.created"},
            "confidence": 90,
            "tags": ["docx", "creation"]
        })

    # Modified date
    if props.modified:
        events.append({
            "timestamp": props.modified.isoformat() if hasattr(props.modified, 'isoformat') else str(props.modified),
            "original_timestamp": str(props.modified),
            "event_type": "file_modified",
            "title": "Document Modified",
            "description": f"DOCX document was last modified",
            "metadata": {"source_property": "core_properties.modified"},
            "confidence": 90,
            "tags": ["docx", "modification"]
        })

    # Last printed
    if props.last_printed:
        events.append({
            "timestamp": props.last_printed.isoformat() if hasattr(props.last_printed, 'isoformat') else str(props.last_printed),
            "original_timestamp": str(props.last_printed),
            "event_type": "file_printed",
            "title": "Document Printed",
            "description": f"DOCX document was last printed",
            "metadata": {"source_property": "core_properties.last_printed"},
            "confidence": 85,
            "tags": ["docx", "print"]
        })

    # Author info
    if props.author:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": props.author,
            "event_type": "author_info",
            "title": f"Author: {props.author}",
            "description": f"Document author identified as '{props.author}'",
            "metadata": {"author": props.author, "source_property": "core_properties.author"},
            "confidence": 50,
            "tags": ["docx", "author"]
        })

    # Last modified by
    if props.last_modified_by:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": props.last_modified_by,
            "event_type": "author_info",
            "title": f"Last Modified By: {props.last_modified_by}",
            "description": f"Document last modified by '{props.last_modified_by}'",
            "metadata": {"last_modified_by": props.last_modified_by, "source_property": "core_properties.last_modified_by"},
            "confidence": 50,
            "tags": ["docx", "author"]
        })

    # Revision number
    if props.revision is not None:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(props.revision),
            "event_type": "document_property",
            "title": f"Revision #{props.revision}",
            "description": f"Document has {props.revision} revision(s)",
            "metadata": {"revision": props.revision, "source_property": "core_properties.revision"},
            "confidence": 50,
            "tags": ["docx", "revision"]
        })

    return events
