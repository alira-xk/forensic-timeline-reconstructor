"""
Legacy DOC metadata extractor using OLE SummaryInformation.
Extracts: created, modified, last_printed, author, last_saved_by, revision.
"""

import os
from datetime import datetime, timezone

try:
    import olefile
except ImportError:
    olefile = None


def _as_iso(value):
    if not value:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()

    return str(value)


def _fallback_file_event(file_path, reason=None):
    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)
    metadata = {"source_property": "filesystem.mtime"}
    if reason:
        metadata["warning"] = reason

    return [{
        "timestamp": file_mtime.isoformat(),
        "original_timestamp": file_mtime.isoformat(),
        "event_type": "file_modified",
        "title": "Legacy Document File Modified",
        "description": "DOC file modification time from filesystem metadata",
        "metadata": metadata,
        "confidence": 35,
        "tags": ["doc", "filesystem", "modification"]
    }]


def _append_datetime_event(events, value, event_type, title, description, source_property, confidence, tags):
    timestamp = _as_iso(value)
    if not timestamp:
        return

    events.append({
        "timestamp": timestamp,
        "original_timestamp": str(value),
        "event_type": event_type,
        "title": title,
        "description": description,
        "metadata": {"source_property": source_property},
        "confidence": confidence,
        "tags": tags
    })


def _append_property_event(events, value, title_prefix, field_name, source_property, event_time):
    if value in (None, ""):
        return

    events.append({
        "timestamp": event_time.isoformat(),
        "original_timestamp": str(value),
        "event_type": "author_info" if "author" in field_name or "saved_by" in field_name else "document_property",
        "title": f"{title_prefix}: {value}",
        "description": f"DOC metadata property '{field_name}' identified as '{value}'",
        "metadata": {field_name: value, "source_property": source_property},
        "confidence": 50,
        "tags": ["doc", field_name]
    })


def extract_doc(file_path):
    if olefile is None:
        return _fallback_file_event(file_path, "olefile package is not installed")

    if not olefile.isOleFile(file_path):
        return _fallback_file_event(file_path, "file is not an OLE compound document")

    events = []
    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)

    with olefile.OleFileIO(file_path) as ole:
        metadata = ole.get_metadata()

        _append_datetime_event(
            events,
            getattr(metadata, "create_time", None),
            "file_created",
            "Legacy Document Created",
            "DOC document was created",
            "summary_information.create_time",
            85,
            ["doc", "creation"]
        )
        _append_datetime_event(
            events,
            getattr(metadata, "last_saved_time", None),
            "file_modified",
            "Legacy Document Modified",
            "DOC document was last saved",
            "summary_information.last_saved_time",
            85,
            ["doc", "modification"]
        )
        _append_datetime_event(
            events,
            getattr(metadata, "last_printed", None),
            "file_printed",
            "Legacy Document Printed",
            "DOC document was last printed",
            "summary_information.last_printed",
            80,
            ["doc", "print"]
        )

        _append_property_event(events, getattr(metadata, "author", None), "Author", "author", "summary_information.author", file_mtime)
        _append_property_event(events, getattr(metadata, "last_saved_by", None), "Last Saved By", "last_saved_by", "summary_information.last_saved_by", file_mtime)
        _append_property_event(events, getattr(metadata, "revision_number", None), "Revision", "revision", "summary_information.revision_number", file_mtime)
        _append_property_event(events, getattr(metadata, "title", None), "Title", "title", "summary_information.title", file_mtime)

    if not events:
        return _fallback_file_event(file_path, "no OLE summary metadata was found")

    return events
