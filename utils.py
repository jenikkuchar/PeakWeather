import re
import unicodedata

def extract_num(text):
    """Extract a number from text"""
    if not text or not isinstance(text, str):
        return None

    # Replace comma with dot for decimal numbers
    text = text.replace(',', '.')

    match = re.search(r'(-?\d+[.]?\d*)', text.strip())
    if match:
        return float(match.group(1))
    return None

def normalize_text(text):
    """Create a code from text by removing diacritics and special characters"""
    # Convert text to lowercase
    text = text.lower()
    # Remove diacritics
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    # Replace spaces and special characters with underscores
    text = re.sub(r'[^a-z0-9]', '_', text)
    # Remove multiple underscores
    text = re.sub(r'_+', '_', text)
    # Remove underscores at the beginning and end
    text = text.strip('_')
    return text
