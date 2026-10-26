import urllib.request
import re
import json

url = "https://superadblocktest.com/adblock.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
data = urllib.request.urlopen(req).read().decode('utf-8')

idx = data.find("const HOST_TESTS")
end_idx = data.find("\n  const TEST_TIMEOUT_MS", idx)
snippet = data[idx:end_idx]

# Extract all list(`...`)
lists = re.findall(r"list\(\s*`([^`]+)`\s*\)", snippet)
all_hosts = []
for l in lists:
    hosts = [h.strip() for h in l.split() if h.strip()]
    all_hosts.extend(hosts)

print(f"Total extracted hosts: {len(all_hosts)}")
print(f"Unique hosts: {len(set(all_hosts))}")

# Check categories
print("Let's see the categories:")
cat_matches = re.findall(r"([A-Za-z0-9_\- ]+):\s*\{", snippet)
print("Categories found:", cat_matches[:10])

with open("scripts/extracted_hosts.json", "w") as f:
    json.dump(sorted(list(set(all_hosts))), f, indent=2)
print("Saved to scripts/extracted_hosts.json")
