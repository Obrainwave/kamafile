import csv
import json

csv_path = r'C:\Users\HP\projects\kamafile\knowledge_sources_15.01.2025.csv'

with open(csv_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
    reader = csv.DictReader(f)
    rows = []
    for i, row in enumerate(reader):
        if i < 10:  # First 10 rows
            rows.append(row)
        else:
            break
    
    # Print headers
    if rows:
        print("Headers:", list(rows[0].keys()))
        print("\n" + "="*80 + "\n")
        
        # Print each row
        for i, row in enumerate(rows):
            print(f"Row {i+1}:")
            for key, value in row.items():
                if value:  # Only print non-empty values
                    print(f"  {key}: {value[:100] if len(value) > 100 else value}")
            print()
