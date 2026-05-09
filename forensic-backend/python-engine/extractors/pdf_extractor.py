"""
PDF metadata extractor using pypdf.
Extracts: CreationDate, ModDate, Author, Creator, Producer, Title, Subject.
Parses PDF date format D:YYYYMMDDHHmmSSOHH'mm' into ISO 8601.
"""

import os
import re
from datetime import datetime, timezone, timedelta
from pypdf import PdfReader


def parse_pdf_date(date_str):
    """Parse PDF date format D:YYYYMMDDHHmmSSOHH'mm' into ISO 8601."""
    if not date_str:
        return None

    date_str = str(date_str)

    # Remove D: prefix
    if date_str.startswith('D:'):
        date_str = date_str[2:]

    # Try standard patterns
    patterns = [
        (r'^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-Z])', None),
        (r'^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})', None),
        (r'^(\d{4})(\d{2})(\d{2})', None),
    ]

    try:
        # Full format with timezone
        match = re.match(r"^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-])(\d{2})'?(\d{2})'?$", date_str)
        if match:
            y, mo, d, h, mi, s, sign, oh, om = match.groups()
            dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s))
            offset_minutes = (int(oh) * 60 + int(om)) * (1 if sign == '+' else -1)
            dt = dt.replace(tzinfo=timezone(timedelta(minutes=offset_minutes)))
            return dt.isoformat()

        # With Z timezone
        match = re.match(r"^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z", date_str)
        if match:
            y, mo, d, h, mi, s = match.groups()
            dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s), tzinfo=timezone.utc)
            return dt.isoformat()

        # Without timezone
        match = re.match(r"^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", date_str)
        if match:
            y, mo, d, h, mi, s = match.groups()
            dt = datetime(int(y), int(mo), int(d), int(h), int(mi), int(s))
            return dt.isoformat()

        # Date only
        match = re.match(r"^(\d{4})(\d{2})(\d{2})", date_str)
        if match:
            y, mo, d = match.groups()
            dt = datetime(int(y), int(mo), int(d))
            return dt.isoformat()

    except (ValueError, TypeError):
        pass

    return None


def extract_pdf(file_path):
    events = []
    reader = PdfReader(file_path)
    meta = reader.metadata
    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)

    if not meta:
        return events

    # CreationDate
    creation_date = getattr(meta, 'creation_date', None) or (meta.get('/CreationDate') if isinstance(meta, dict) else None)
    if creation_date:
        ts = None
        if hasattr(creation_date, 'isoformat'):
            ts = creation_date.isoformat()
        else:
            ts = parse_pdf_date(str(creation_date))

        if ts:
            events.append({
                "timestamp": ts,
                "original_timestamp": str(creation_date),
                "event_type": "file_created",
                "title": "PDF Created",
                "description": "PDF document creation date from metadata",
                "metadata": {"source_property": "/CreationDate"},
                "confidence": 90,
                "tags": ["pdf", "creation"]
            })

    # ModDate
    mod_date = getattr(meta, 'modification_date', None) or (meta.get('/ModDate') if isinstance(meta, dict) else None)
    if mod_date:
        ts = None
        if hasattr(mod_date, 'isoformat'):
            ts = mod_date.isoformat()
        else:
            ts = parse_pdf_date(str(mod_date))

        if ts:
            events.append({
                "timestamp": ts,
                "original_timestamp": str(mod_date),
                "event_type": "file_modified",
                "title": "PDF Modified",
                "description": "PDF document modification date from metadata",
                "metadata": {"source_property": "/ModDate"},
                "confidence": 90,
                "tags": ["pdf", "modification"]
            })

    # Author
    author = getattr(meta, 'author', None) or (meta.get('/Author') if isinstance(meta, dict) else None)
    if author:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(author),
            "event_type": "author_info",
            "title": f"Author: {author}",
            "description": f"PDF author identified as '{author}'",
            "metadata": {"author": str(author), "source_property": "/Author"},
            "confidence": 50,
            "tags": ["pdf", "author"]
        })

    # Creator
    creator = getattr(meta, 'creator', None) or (meta.get('/Creator') if isinstance(meta, dict) else None)
    if creator:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(creator),
            "event_type": "metadata",
            "title": f"Creator Application: {creator}",
            "description": f"PDF was created using '{creator}'",
            "metadata": {"creator": str(creator), "source_property": "/Creator"},
            "confidence": 50,
            "tags": ["pdf", "software"]
        })

    # Producer
    producer = getattr(meta, 'producer', None) or (meta.get('/Producer') if isinstance(meta, dict) else None)
    if producer:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(producer),
            "event_type": "metadata",
            "title": f"PDF Producer: {producer}",
            "description": f"PDF was produced by '{producer}'",
            "metadata": {"producer": str(producer), "source_property": "/Producer"},
            "confidence": 50,
            "tags": ["pdf", "software"]
        })

    # Title
    title = getattr(meta, 'title', None) or (meta.get('/Title') if isinstance(meta, dict) else None)
    if title:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(title),
            "event_type": "document_property",
            "title": f"Document Title: {title}",
            "description": f"PDF document title is '{title}'",
            "metadata": {"title": str(title), "source_property": "/Title"},
            "confidence": 50,
            "tags": ["pdf", "property"]
        })

    # Subject
    subject = getattr(meta, 'subject', None) or (meta.get('/Subject') if isinstance(meta, dict) else None)
    if subject:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(subject),
            "event_type": "document_property",
            "title": f"Document Subject: {subject}",
            "description": f"PDF document subject is '{subject}'",
            "metadata": {"subject": str(subject), "source_property": "/Subject"},
            "confidence": 50,
            "tags": ["pdf", "property"]
        })

    return events
