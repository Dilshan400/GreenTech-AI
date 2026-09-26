import json
import os

os.makedirs("e:/GreenTech-AI/frontend/data", exist_ok=True)
src_file = "e:/GreenTech-AI/backend/data/vector_store.json"
dst_file = "e:/GreenTech-AI/frontend/data/knowledge.json"

with open(src_file, "r", encoding="utf-8") as f:
    data = json.load(f)

chunks = []
for idx, item in enumerate(data):
    title = item.get("title") or "Document"
    chunk_idx = item.get("chunk_index", idx)
    chunks.append({
        "id": f"{title}-chunk-{chunk_idx}",
        "text": item.get("text", ""),
        "embedding": item.get("embedding", []),
        "metadata": {
            "documentName": title,
            "category": item.get("category", "General"),
            "sectionHeader": item.get("research_factor") or ""
        }
    })

with open(dst_file, "w", encoding="utf-8") as f:
    json.dump({"chunks": chunks}, f, indent=2, ensure_ascii=False)

print(f"Synced {len(chunks)} chunks to {dst_file}")
