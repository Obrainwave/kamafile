import csv
import json

csv_path = r'C:\Users\HP\projects\kamafile\knowledge_sources_15.01.2025.csv'

with open(csv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
    reader = csv.DictReader(f)
    rows = []
    for i, row in enumerate(reader):
        if i < 5:  # First 5 rows only
            rows.append(row)
        else:
            break

# Write to JSON file
with open(r'C:\Users\HP\projects\kamafile\csv_sample.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, indent=2, ensure_ascii=False)

print("Saved to csv_sample.json")
print(f"Total columns: {len(rows[0].keys()) if rows else 0}")
print(f"Column names: {list(rows[0].keys()) if rows else []}")
