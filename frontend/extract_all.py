import json
import base64
import os
import re

input_file = r"C:\Users\Abhishek Sheth\.gemini\antigravity-ide\brain\061c0bf6-ccad-4d2e-93c8-679a8c5573ed\.system_generated\steps\17\output.txt"
output_dir = r"d:\qrepo\qrepo-main\frontend\stitch_screens"

os.makedirs(output_dir, exist_ok=True)

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

for screen in data.get("screens", []):
    title = screen.get("title", "Untitled").replace(" ", "_").replace("-", "_").replace("&", "and")
    # clean title
    title = re.sub(r'[^a-zA-Z0-9_]', '', title)
    html_code = screen.get("htmlCode", {})
    url = html_code.get("downloadUrl", "")
    
    if url.startswith("data:text/html;base64,"):
        b64_data = url.split(",", 1)[1]
        try:
            html = base64.b64decode(b64_data).decode("utf-8")
            file_path = os.path.join(output_dir, f"{title}.html")
            with open(file_path, "w", encoding="utf-8") as out:
                out.write(html)
            print(f"Saved {title}.html (from base64)")
        except Exception as e:
            print(f"Failed to decode {title}: {e}")
    elif url.startswith("http"):
        import urllib.request
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8')
            file_path = os.path.join(output_dir, f"{title}.html")
            with open(file_path, "w", encoding="utf-8") as out:
                out.write(html)
            print(f"Saved {title}.html (downloaded)")
        except Exception as e:
            print(f"Failed to download {title}: {e}")
    else:
        print(f"No valid URL found for {title}")
