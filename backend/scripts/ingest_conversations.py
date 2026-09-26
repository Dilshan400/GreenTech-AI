import os
import sys
import csv
import json
import uuid

# Add parent directory to path to enable app imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine, SessionLocal
from app.models.base import Base
from app.models.faq import FAQConversation
from app.models.document import KnowledgeDocument
from app.utils.embeddings import get_mock_embedding
from scripts.ingest import run_ingestion

CATEGORY_METADATA = {
    "ATGP": {
        "title": "Attitude Toward Green Products (ATGP) - Expert Q&A Knowledge",
        "category": "green_purchase_intention",
        "research_factor": "attitude_toward_green_products",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "atgp_attitude_dialogues.md"
    },
    "SN": {
        "title": "Social Norms and Peer Influence (SN) - Expert Q&A Knowledge",
        "category": "green_purchase_intention",
        "research_factor": "social_influence",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "sn_social_norms_dialogues.md"
    },
    "EC": {
        "title": "Environmental Concern and E-Waste Awareness (EC) - Expert Q&A Knowledge",
        "category": "e_waste",
        "research_factor": "environmental_concern",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "ec_environmental_concern_dialogues.md"
    },
    "PS": {
        "title": "Price Sensitivity and Value Analysis (PS) - Expert Q&A Knowledge",
        "category": "green_purchase_intention",
        "research_factor": "green_price_sensitivity",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "ps_price_sensitivity_dialogues.md"
    },
    "GA": {
        "title": "Green Advertising and Claims Verification (GA) - Expert Q&A Knowledge",
        "category": "green_purchase_intention",
        "research_factor": "green_advertising",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "ga_green_advertising_dialogues.md"
    },
    "GPI": {
        "title": "Green Purchase Intention (GPI) - Expert Q&A Knowledge",
        "category": "green_purchase_intention",
        "research_factor": "green_purchase_intention",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "gpi_purchase_intention_dialogues.md"
    },
    "General": {
        "title": "General Green Electronics Best Practices - Expert Q&A Knowledge",
        "category": "green_electronics",
        "research_factor": "general_guidance",
        "source": "GreenTech Advisor Expert Conversation Guidelines",
        "file_name": "general_electronics_dialogues.md"
    }
}

def ingest_conversations_to_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "data", "conversations.csv")
    kb_conversations_dir = os.path.join(base_dir, "knowledge_base", "conversations")
    os.makedirs(kb_conversations_dir, exist_ok=True)
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return
        
    print("=========================================================")
    print("INGESTING CONVERSATION FILE INTO DATABASE & CHATBOT")
    print(f"Source CSV: {csv_path}")
    print("=========================================================")
    
    # 1. Create table in PostgreSQL if not present
    Base.metadata.create_all(bind=engine)
    
    rows = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
            
    print(f"Read {len(rows)} conversation Q&A pairs from CSV.")
    
    # 2. Upsert into PostgreSQL table: faq_conversations
    db = SessionLocal()
    inserted_faq = 0
    updated_faq = 0
    
    try:
        for r in rows:
            cat = r["category"].strip()
            user_msg = r["user_message"].strip()
            asst_resp = r["assistant_response"].strip()
            keywords = r["keywords"].strip()
            
            existing = db.query(FAQConversation).filter(
                FAQConversation.user_message == user_msg
            ).first()
            
            if existing:
                existing.category = cat
                existing.assistant_response = asst_resp
                existing.keywords = keywords
                updated_faq += 1
            else:
                new_faq = FAQConversation(
                    id=str(uuid.uuid4()),
                    category=cat,
                    user_message=user_msg,
                    assistant_response=asst_resp,
                    keywords=keywords
                )
                db.add(new_faq)
                inserted_faq += 1
                
        db.commit()
        print(f"PostgreSQL faq_conversations: {inserted_faq} inserted, {updated_faq} updated.")
    finally:
        db.close()
        
    # 3. Generate Markdown Knowledge Base documents grouped by Category
    # Group rows by category
    grouped = {}
    for r in rows:
        cat = r["category"].strip()
        grouped.setdefault(cat, []).append(r)
        
    for cat, items in grouped.items():
        meta = CATEGORY_METADATA.get(cat, {
            "title": f"{cat} Q&A Knowledge",
            "category": "green_purchase_intention",
            "research_factor": cat.lower(),
            "source": "GreenTech Advisor Expert Conversation Guidelines",
            "file_name": f"{cat.lower()}_dialogues.md"
        })
        
        md_file_path = os.path.join(kb_conversations_dir, meta["file_name"])
        
        # Build keywords list
        all_kw = set()
        for it in items:
            for kw in it["keywords"].split(","):
                if kw.strip():
                    all_kw.add(kw.strip())
        keywords_str = json.dumps(list(all_kw))
        
        # Build Markdown content
        md_content = f"""---
title: "{meta['title']}"
category: "{meta['category']}"
research_factor: "{meta['research_factor']}"
source_type: "Curated Q&A Guideline"
source: "{meta['source']}"
keywords: {keywords_str}
---

# {meta['title']}

This knowledge reference document contains verified consultation dialogues and recommended answers for consumer and student inquiries regarding {meta['research_factor'].replace('_', ' ')}.

"""
        for it in items:
            md_content += f"""### Question: {it['user_message']}
**Keywords**: {it['keywords']}  
**Guidance Answer**: {it['assistant_response']}

"""
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write(md_content)
            
    print(f"Generated {len(grouped)} category Markdown knowledge documents in {kb_conversations_dir}")
    
    # 4. Run main ingestion pipeline to sync KnowledgeDocuments and rebuild vector store
    print("\nTriggering full Knowledge Base & Vector Index ingestion...")
    run_ingestion()
    
    # 5. Enrich vector_store.json with individual high-precision Q&A pairs
    vector_db_path = os.path.join(base_dir, "data", "vector_store.json")
    if os.path.exists(vector_db_path):
        with open(vector_db_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
            
        print(f"Loaded {len(chunks)} existing vector chunks from index.")
        
        # Add individual Q&A pairs as dedicated direct chunks
        added_direct = 0
        for idx, r in enumerate(rows):
            cat = r["category"].strip()
            user_msg = r["user_message"].strip()
            asst_resp = r["assistant_response"].strip()
            keywords = [k.strip() for k in r["keywords"].split(",") if k.strip()]
            meta = CATEGORY_METADATA.get(cat, {})
            
            # Format text as clean Q&A so response generator uses it directly
            qa_text = f"{asst_resp}\n\n[In response to: \"{user_msg}\"]"
            kw_list = keywords + [user_msg.lower()]
            
            chunk_embedding = get_mock_embedding(f"{user_msg} {asst_resp}", kw_list)
            
            chunks.append({
                "doc_id": f"faq-{cat}-{idx}",
                "chunk_index": 0,
                "text": asst_resp,  # clean assistant response for natural chatting
                "title": user_msg,
                "category": meta.get("category", "green_purchase_intention"),
                "research_factor": meta.get("research_factor", cat.lower()),
                "source": "GreenTech Curated Advisor FAQ",
                "keywords": keywords,
                "embedding": chunk_embedding
            })
            added_direct += 1
            
        with open(vector_db_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
            
        print(f"Indexed {added_direct} direct Q&A conversation pairs into {vector_db_path}.")
        print(f"Total vector chunks in index: {len(chunks)}")
        
    print("=========================================================")
    print("CONVERSATION INGESTION COMPLETED SUCCESSFULLY!")
    print("=========================================================")

if __name__ == "__main__":
    ingest_conversations_to_db()
