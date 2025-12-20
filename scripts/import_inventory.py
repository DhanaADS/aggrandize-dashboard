#!/usr/bin/env python3
"""
Import inventory.csv to website_inventory table via Umbrel API
"""

import csv
import json
import requests
import re
import sys

API_URL = "https://api.aggrandizedigital.com/query"
API_KEY = "e622c42ee210f3ad0af8ec91ec92d164cfb16e3e9ecec5e991eb6fe2ece2180e"
ADMIN_KEY = "v4+qGvUcO3A0Gqhstn84pWu9v2E2xnZ5DlPCtvafvKs="

def parse_price(price_str):
    """Parse price like '$75' or '$1,800' to decimal"""
    if not price_str or price_str.strip() == '':
        return 0
    # Remove $ and commas
    cleaned = price_str.replace('$', '').replace(',', '').strip()
    try:
        return float(cleaned)
    except:
        return 0

def parse_traffic(traffic_str):
    """Parse traffic like '74K' or '158.1K' to integer"""
    if not traffic_str or traffic_str.strip() == '':
        return 0
    cleaned = traffic_str.upper().replace(',', '').strip()
    try:
        if 'K' in cleaned:
            return int(float(cleaned.replace('K', '')) * 1000)
        elif 'M' in cleaned:
            return int(float(cleaned.replace('M', '')) * 1000000)
        else:
            return int(float(cleaned))
    except:
        return 0

def parse_bool(val):
    """Parse Yes/No/- to boolean"""
    if not val:
        return False
    val = val.strip().lower()
    return val in ['yes', 'true', '1']

def parse_dofollow(val):
    """Parse Do Follow field (Yes/No/Nofollow/-)"""
    if not val:
        return True  # Default to dofollow
    val = val.strip().lower()
    if val in ['yes', 'true', '1']:
        return True
    if val in ['no', 'nofollow', 'false', '0', '-']:
        return False
    return True

def clean_website(url):
    """Clean website URL to just domain"""
    if not url:
        return None
    # Remove protocol
    url = re.sub(r'^https?://', '', url)
    # Remove www.
    url = re.sub(r'^www\.', '', url)
    # Remove trailing slash
    url = url.rstrip('/')
    return url

def parse_int(val):
    """Parse integer safely"""
    if not val or val.strip() == '':
        return None
    try:
        return int(val)
    except:
        return None

def insert_website(row):
    """Insert a single website into database"""
    website = clean_website(row.get('Magazines', ''))
    if not website:
        return None, "No website URL"

    # Build data
    data = {
        'website': website,
        'contact': row.get('Contact', '').strip() or None,
        'category': row.get('Category/Section', '').strip() or None,
        'da': parse_int(row.get('DA', '')),
        'domain_rating': parse_int(row.get('AS', '')),
        'organic_traffic': parse_traffic(row.get('New OT', '')),
        'client_price': parse_price(row.get('Price', '')),
        'is_indexed': parse_bool(row.get('Indexed', '')),
        'do_follow': parse_dofollow(row.get('Do Follow', '')),
        'news': parse_bool(row.get('News', '')),
        'sponsored': parse_bool(row.get('Sponsored', '')),
        'cbd': parse_bool(row.get('CBD', '')),
        'casino': parse_bool(row.get('Casino', '')),
        'dating': parse_bool(row.get('Dating', '')),
        'crypto': parse_bool(row.get('Crypto', '')),
        'tat': parse_int(row.get('TAT', '')),
        'status': 'active'
    }

    # Build SQL
    fields = [k for k, v in data.items() if v is not None]
    values = [v for v in data.values() if v is not None]
    placeholders = [f'${i+1}' for i in range(len(fields))]

    sql = f"INSERT INTO website_inventory ({', '.join(fields)}) VALUES ({', '.join(placeholders)}) ON CONFLICT (website) DO NOTHING RETURNING id, website"

    try:
        response = requests.post(
            API_URL,
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'X-ADMIN-KEY': ADMIN_KEY
            },
            json={'sql': sql, 'params': values},
            timeout=30
        )
        result = response.json()
        if result.get('success'):
            if result.get('rowCount', 0) > 0:
                return result['rows'][0], None
            else:
                return None, "Duplicate (skipped)"
        else:
            return None, result.get('error', 'Unknown error')
    except Exception as e:
        return None, str(e)

def main():
    import time

    csv_path = '/Users/dhanapale/Downloads/inventory.csv'
    start_from = int(sys.argv[1]) if len(sys.argv) > 1 else 0

    print(f"Reading {csv_path}...")

    success_count = 0
    skip_count = 0
    error_count = 0
    errors = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Found {len(rows)} rows to import (starting from row {start_from})")

    for i, row in enumerate(rows):
        if i < start_from:
            continue

        # Add delay to avoid rate limiting (100 req/60s = ~1.7 req/s)
        time.sleep(0.7)
        # Skip empty rows
        if not row.get('Magazines') or row.get('Magazines', '').strip() == '':
            skip_count += 1
            continue

        # Retry logic for rate limiting
        retries = 3
        result = None
        error = None
        for attempt in range(retries):
            result, error = insert_website(row)
            if error and 'Too many requests' in error:
                print(f"  Rate limited at row {i+1}, waiting 60s... (attempt {attempt+1}/{retries})")
                time.sleep(60)
                continue
            break

        if result:
            success_count += 1
            if success_count % 50 == 0:
                print(f"  Imported {success_count} websites...")
        elif error == "Duplicate (skipped)":
            skip_count += 1
        else:
            error_count += 1
            errors.append(f"Row {i+1} ({row.get('Magazines', 'unknown')}): {error}")

    print(f"\n=== Import Complete ===")
    print(f"Successfully imported: {success_count}")
    print(f"Skipped (duplicates/empty): {skip_count}")
    print(f"Errors: {error_count}")

    if errors and error_count <= 10:
        print("\nErrors:")
        for e in errors:
            print(f"  - {e}")
    elif errors:
        print(f"\nFirst 10 errors:")
        for e in errors[:10]:
            print(f"  - {e}")

if __name__ == '__main__':
    main()
