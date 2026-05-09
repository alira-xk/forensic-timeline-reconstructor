"""
Image EXIF metadata extractor using Pillow + piexif.
Extracts: DateTimeOriginal, DateTime, DateTimeDigitized, GPSInfo, Make/Model.
Parses EXIF datetime YYYY:MM:DD HH:MM:SS into ISO 8601.
Falls back to file mtime if no EXIF data.
"""

import os
from datetime import datetime, timezone
from PIL import Image

try:
    import piexif
    HAS_PIEXIF = True
except ImportError:
    HAS_PIEXIF = False


def parse_exif_datetime(dt_str):
    """Parse EXIF datetime format YYYY:MM:DD HH:MM:SS into ISO 8601."""
    if not dt_str:
        return None
    try:
        if isinstance(dt_str, bytes):
            dt_str = dt_str.decode('utf-8', errors='ignore').strip('\x00')
        dt_str = dt_str.strip()
        if not dt_str or dt_str == '0000:00:00 00:00:00':
            return None
        dt = datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S')
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def convert_gps_to_decimal(gps_data):
    """Convert GPS coordinates from EXIF rational format to decimal degrees."""
    try:
        def rational_to_float(rational):
            if isinstance(rational, tuple) and len(rational) == 2:
                if rational[1] == 0:
                    return 0.0
                return rational[0] / rational[1]
            return float(rational)

        lat_data = gps_data.get(piexif.GPSIFD.GPSLatitude) if HAS_PIEXIF else None
        lat_ref = gps_data.get(piexif.GPSIFD.GPSLatitudeRef) if HAS_PIEXIF else None
        lon_data = gps_data.get(piexif.GPSIFD.GPSLongitude) if HAS_PIEXIF else None
        lon_ref = gps_data.get(piexif.GPSIFD.GPSLongitudeRef) if HAS_PIEXIF else None

        if not lat_data or not lon_data:
            return None

        lat = rational_to_float(lat_data[0]) + rational_to_float(lat_data[1]) / 60 + rational_to_float(lat_data[2]) / 3600
        lon = rational_to_float(lon_data[0]) + rational_to_float(lon_data[1]) / 60 + rational_to_float(lon_data[2]) / 3600

        if lat_ref and (lat_ref == b'S' or lat_ref == 'S'):
            lat = -lat
        if lon_ref and (lon_ref == b'W' or lon_ref == 'W'):
            lon = -lon

        return {"latitude": round(lat, 6), "longitude": round(lon, 6)}
    except Exception:
        return None


def extract_image(file_path):
    events = []
    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path), tz=timezone.utc)

    try:
        img = Image.open(file_path)
    except Exception:
        # Not a valid image — fallback to file mtime
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(file_mtime),
            "event_type": "file_modified",
            "title": "File Modified (OS)",
            "description": "File modification time from operating system (no EXIF data available)",
            "metadata": {"source": "file_system"},
            "confidence": 30,
            "tags": ["image", "fallback"]
        })
        return events

    exif_data = {}
    if HAS_PIEXIF:
        try:
            exif_bytes = img.info.get('exif', b'')
            if exif_bytes:
                exif_data = piexif.load(exif_bytes)
        except Exception:
            exif_data = {}

    has_exif_dates = False
    exif_ifd = exif_data.get('Exif', {}) if exif_data else {}
    zeroth_ifd = exif_data.get('0th', {}) if exif_data else {}
    gps_ifd = exif_data.get('GPS', {}) if exif_data else {}

    # DateTimeOriginal
    if HAS_PIEXIF and piexif.ExifIFD.DateTimeOriginal in exif_ifd:
        raw = exif_ifd[piexif.ExifIFD.DateTimeOriginal]
        ts = parse_exif_datetime(raw)
        if ts:
            has_exif_dates = True
            events.append({
                "timestamp": ts,
                "original_timestamp": raw.decode('utf-8', errors='ignore') if isinstance(raw, bytes) else str(raw),
                "event_type": "exif_datetime",
                "title": "Photo Taken (DateTimeOriginal)",
                "description": "Original date and time when the photo was taken",
                "metadata": {"exif_tag": "DateTimeOriginal"},
                "confidence": 95,
                "tags": ["image", "exif", "capture"]
            })

    # DateTime
    if HAS_PIEXIF and piexif.ImageIFD.DateTime in zeroth_ifd:
        raw = zeroth_ifd[piexif.ImageIFD.DateTime]
        ts = parse_exif_datetime(raw)
        if ts:
            has_exif_dates = True
            events.append({
                "timestamp": ts,
                "original_timestamp": raw.decode('utf-8', errors='ignore') if isinstance(raw, bytes) else str(raw),
                "event_type": "file_modified",
                "title": "Image Modified (DateTime)",
                "description": "Date and time the image file was last modified",
                "metadata": {"exif_tag": "DateTime"},
                "confidence": 85,
                "tags": ["image", "exif", "modification"]
            })

    # DateTimeDigitized
    if HAS_PIEXIF and piexif.ExifIFD.DateTimeDigitized in exif_ifd:
        raw = exif_ifd[piexif.ExifIFD.DateTimeDigitized]
        ts = parse_exif_datetime(raw)
        if ts:
            has_exif_dates = True
            events.append({
                "timestamp": ts,
                "original_timestamp": raw.decode('utf-8', errors='ignore') if isinstance(raw, bytes) else str(raw),
                "event_type": "exif_datetime",
                "title": "Image Digitized (DateTimeDigitized)",
                "description": "Date and time the image was digitized",
                "metadata": {"exif_tag": "DateTimeDigitized"},
                "confidence": 90,
                "tags": ["image", "exif", "digitized"]
            })

    # GPS Info
    if gps_ifd:
        coords = convert_gps_to_decimal(gps_ifd)
        if coords:
            events.append({
                "timestamp": events[0]["timestamp"] if events else file_mtime.isoformat(),
                "original_timestamp": f"GPS: {coords['latitude']}, {coords['longitude']}",
                "event_type": "gps_location",
                "title": f"GPS Location: {coords['latitude']}, {coords['longitude']}",
                "description": "GPS coordinates extracted from image EXIF data",
                "metadata": coords,
                "confidence": 90,
                "tags": ["image", "exif", "gps", "location"]
            })

    # Camera Make/Model
    make = zeroth_ifd.get(piexif.ImageIFD.Make, b'') if HAS_PIEXIF else b''
    model = zeroth_ifd.get(piexif.ImageIFD.Model, b'') if HAS_PIEXIF else b''
    if make or model:
        make_str = make.decode('utf-8', errors='ignore').strip('\x00') if isinstance(make, bytes) else str(make)
        model_str = model.decode('utf-8', errors='ignore').strip('\x00') if isinstance(model, bytes) else str(model)
        camera = f"{make_str} {model_str}".strip()
        if camera:
            events.append({
                "timestamp": events[0]["timestamp"] if events else file_mtime.isoformat(),
                "original_timestamp": camera,
                "event_type": "metadata",
                "title": f"Camera: {camera}",
                "description": f"Image captured with '{camera}'",
                "metadata": {"make": make_str, "model": model_str},
                "confidence": 50,
                "tags": ["image", "exif", "camera"]
            })

    # Fallback to file mtime if no EXIF dates
    if not has_exif_dates:
        events.append({
            "timestamp": file_mtime.isoformat(),
            "original_timestamp": str(file_mtime),
            "event_type": "file_modified",
            "title": "File Modified (OS Fallback)",
            "description": "File modification time from operating system — no EXIF date tags found",
            "metadata": {"source": "file_system", "reason": "no_exif_dates"},
            "confidence": 30,
            "tags": ["image", "fallback"]
        })

    return events
