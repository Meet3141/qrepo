import base64
import re

with open(r"C:\Users\Abhishek Sheth\.gemini\antigravity-ide\brain\061c0bf6-ccad-4d2e-93c8-679a8c5573ed\.system_generated\steps\17\output.txt", "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r'"downloadUrl":"data:text/html;base64,([^"]+)"', content)
if match:
    b64_data = match.group(1)
    html = base64.b64decode(b64_data).decode("utf-8")
    with open(r"d:\qrepo\qrepo-main\frontend\stitch_screen.html", "w", encoding="utf-8") as out:
        out.write(html)
    print("Decoded and saved to stitch_screen.html")
else:
    print("Not found")
