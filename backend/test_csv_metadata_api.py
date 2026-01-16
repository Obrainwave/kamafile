# Test CSV Metadata API Endpoints
# Run this script to test the CSV metadata implementation

import requests
import json

BASE_URL = "http://localhost:8001"

# Test 1: Check if backend is running
print("=" * 60)
print("Test 1: Check Backend Health")
print("=" * 60)
try:
    response = requests.get(f"{BASE_URL}/docs", timeout=5)
    if response.status_code == 200:
        print("✅ Backend is running!")
    else:
        print(f"⚠️  Backend returned status code: {response.status_code}")
except Exception as e:
    print(f"❌ Backend is not accessible: {e}")
    print("\nPlease ensure:")
    print("1. Docker containers are running: docker ps")
    print("2. Backend is listening on port 8001")
    exit(1)

print()

# Test 2: Get catalog stats (should return zeros initially)
print("=" * 60)
print("Test 2: Get Metadata Catalog Stats")
print("=" * 60)
try:
    # Note: You'll need to add authentication token here
    headers = {
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
    response = requests.get(f"{BASE_URL}/api/admin/rag/metadata-catalog/stats", headers=headers, timeout=5)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print("✅ Catalog Stats Retrieved:")
        print(json.dumps(stats, indent=2))
    elif response.status_code == 401:
        print("⚠️  Authentication required. Please add your token to the script.")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# Test 3: List catalog entries
print("=" * 60)
print("Test 3: List Catalog Entries")
print("=" * 60)
try:
    headers = {
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
    response = requests.get(f"{BASE_URL}/api/admin/rag/metadata-catalog", headers=headers, timeout=5)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        entries = response.json()
        print(f"✅ Found {len(entries)} catalog entries")
        if entries:
            print("\nFirst entry:")
            print(json.dumps(entries[0], indent=2))
    elif response.status_code == 401:
        print("⚠️  Authentication required. Please add your token to the script.")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# Test 4: Get pending documents
print("=" * 60)
print("Test 4: Get Pending Documents")
print("=" * 60)
try:
    headers = {
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }
    response = requests.get(f"{BASE_URL}/api/admin/rag/metadata-catalog/pending-documents", headers=headers, timeout=5)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        pending = response.json()
        print(f"✅ Found {len(pending)} pending documents")
        if pending:
            print("\nFirst pending document:")
            print(json.dumps(pending[0], indent=2))
    elif response.status_code == 401:
        print("⚠️  Authentication required. Please add your token to the script.")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print()
print("=" * 60)
print("Testing Complete!")
print("=" * 60)
print("\nNext Steps:")
print("1. Add your authentication token to this script")
print("2. Upload a CSV catalog using the upload endpoint")
print("3. Upload a matching document to test metadata injection")
