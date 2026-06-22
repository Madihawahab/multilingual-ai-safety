import json
import os
from pathlib import Path

print("="*60)
print("📦 COMBINING 240 QUESTION FILES INTO ONE")
print("="*60)

# Get all JSON files from data folder
data_folder = "data"
json_files = sorted([f for f in os.listdir(data_folder) if f.endswith('.json')])

print(f"Found {len(json_files)} files in data/ folder")

# Combine all questions
all_questions = []

for i, filename in enumerate(json_files, 1):
    try:
        file_path = os.path.join(data_folder, filename)
        
        with open(file_path, "r", encoding="utf-8") as f:
            question = json.load(f)
        
        all_questions.append(question)
        print(f"[{i}/{len(json_files)}] ✅ {filename}")
    
    except Exception as e:
        print(f"[{i}/{len(json_files)}] ❌ {filename} - Error: {e}")

print("="*60)

# Save combined file
output_file = os.path.join(data_folder, "questions.json")

try:
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, indent=2, ensure_ascii=False)
    
    print(f"✅ SUCCESS!")
    print(f"📊 Combined {len(all_questions)} questions")
    print(f"💾 Saved to: data/questions.json")
    print("="*60)

except Exception as e:
    print(f"❌ Error saving file: {e}")