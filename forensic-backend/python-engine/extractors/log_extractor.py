"""
Log file extractor using regex pattern matching.
Parses: ISO 8601, Apache/Nginx CLF, syslog, Windows event log, Python logging.
Detects severity (ERROR/WARN/INFO). Caps at 500 events (even sampling if over limit).
"""

import re
import os
from datetime import datetime, timezone
from dateutil import parser as dateutil_parser


# Timestamp regex patterns
PATTERNS = [
    # ISO 8601: 2023-10-24T09:41:00.000Z or 2023-10-24T09:41:00+05:00
    (r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)', 'iso8601'),
    # ISO 8601 with space: 2023-10-24 09:41:00
    (r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)', 'iso8601_space'),
    # Apache/Nginx CLF: [24/Oct/2023:09:41:00 +0500]
    (r'\[(\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}\s*[+-]\d{4})\]', 'clf'),
    # Syslog: Oct 24 09:41:00
    (r'(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})', 'syslog'),
    # Windows event log: 10/24/2023 09:41:00 AM
    (r'(\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)', 'windows'),
    # Python logging: 2023-10-24 09:41:00,123
    (r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})', 'python_log'),
]

SEVERITY_PATTERNS = [
    (r'\bERROR\b|\bFATAL\b|\bCRITICAL\b', 'ERROR'),
    (r'\bWARN(?:ING)?\b', 'WARN'),
    (r'\bINFO\b', 'INFO'),
    (r'\bDEBUG\b', 'DEBUG'),
    (r'\bTRACE\b', 'TRACE'),
]

MAX_EVENTS = 500


def parse_timestamp(raw_ts, fmt_type):
    """Parse a raw timestamp string into ISO 8601 format."""
    try:
        if fmt_type == 'python_log':
            raw_ts = raw_ts.replace(',', '.')

        if fmt_type == 'clf':
            dt = datetime.strptime(raw_ts, '%d/%b/%Y:%H:%M:%S %z')
            return dt.isoformat()

        if fmt_type == 'syslog':
            year = datetime.now().year
            dt = datetime.strptime(f"{year} {raw_ts}", '%Y %b %d %H:%M:%S')
            return dt.isoformat()

        if fmt_type == 'windows':
            for fmt in ['%m/%d/%Y %I:%M:%S %p', '%m/%d/%Y %H:%M:%S']:
                try:
                    dt = datetime.strptime(raw_ts.strip(), fmt)
                    return dt.isoformat()
                except ValueError:
                    continue

        # Fallback: use dateutil parser
        dt = dateutil_parser.parse(raw_ts)
        return dt.isoformat()

    except Exception:
        return None


def detect_severity(line):
    """Detect log severity from line content."""
    for pattern, level in SEVERITY_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return level
    return 'INFO'


def severity_to_event_type(severity):
    """Map severity to event type."""
    mapping = {
        'ERROR': 'log_error',
        'FATAL': 'log_error',
        'CRITICAL': 'log_error',
        'WARN': 'log_warning',
        'WARNING': 'log_warning',
        'INFO': 'log_info',
        'DEBUG': 'log_entry',
        'TRACE': 'log_entry',
    }
    return mapping.get(severity, 'log_entry')


def extract_log(file_path):
    events = []

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception:
        return events

    parsed_events = []

    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue

        timestamp = None
        original_ts = None
        fmt_type = None

        for pattern, ptype in PATTERNS:
            match = re.search(pattern, line)
            if match:
                original_ts = match.group(1)
                fmt_type = ptype
                timestamp = parse_timestamp(original_ts, ptype)
                if timestamp:
                    break

        if not timestamp:
            continue

        severity = detect_severity(line)
        event_type = severity_to_event_type(severity)

        # Clean description: remove the timestamp portion
        description = line
        if original_ts:
            description = line.replace(original_ts, '').strip()
            # Clean leading/trailing brackets, dashes, pipes
            description = re.sub(r'^[\[\]\-|:\s]+', '', description)

        parsed_events.append({
            "timestamp": timestamp,
            "original_timestamp": original_ts,
            "event_type": event_type,
            "title": f"{severity} — Line {line_num}",
            "description": description[:500] if description else f"Log entry at line {line_num}",
            "metadata": {
                "line_number": line_num,
                "severity": severity,
                "format_detected": fmt_type,
                "raw_line": line[:300],
            },
            "confidence": 80,
            "tags": ["log", severity.lower()]
        })

    # Even sampling if over MAX_EVENTS
    if len(parsed_events) > MAX_EVENTS:
        step = len(parsed_events) / MAX_EVENTS
        sampled = []
        idx = 0.0
        while len(sampled) < MAX_EVENTS and int(idx) < len(parsed_events):
            sampled.append(parsed_events[int(idx)])
            idx += step
        parsed_events = sampled

    return parsed_events
