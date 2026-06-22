import json
import os

data_folder = r"C:\Users\Vinni Kapoor\Desktop\Projects\multilingual-ai-safety\data"

all_results = []

for i in range(1, 51):
    filename = f"Q{i:03d}.json"   # Q001.json, Q002.json ...
    file_path = os.path.join(data_folder, filename)

    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, list):
                all_results.extend(data)
            else:
                all_results.append(data)

        except Exception as e:
            print(f"Error reading {filename}: {e}")
    else:
        print(f"Missing: {filename}")

with open("combined_50.json", "w", encoding="utf-8") as f:
    json.dump(all_results, f, ensure_ascii=False, indent=2)

print(f"Combined {len(all_results)} entries into combined_50.json")