import os
from dotenv import load_dotenv
import json
import faiss
import numpy as np
import pandas as pd
from tqdm import tqdm
from openai import OpenAI

load_dotenv() 

# --- Config ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "text-embedding-3-small"
BATCH_SIZE = 100  # adjust if you hit rate limits
alpha, beta = 0.6, 0.4

# --- Load Movie Data ---
with open('movie_dataset.json', 'r') as f:
    data = json.load(f)

movies = pd.DataFrame.from_dict(data, orient='index')

# --- Helper: Batch Embedding ---
def get_embeddings(texts, batch_size=100):
    embeddings = []
    for i in tqdm(range(0, len(texts), batch_size)):
        batch = texts[i : i + batch_size]
        batch = [t if isinstance(t, str) else str(t) for t in batch]
        try:
            response = client.embeddings.create(model=MODEL, input=batch)
            embeddings.extend([d.embedding for d in response.data])
        except Exception as e:
            print(f"\n❌ Error in batch {i//batch_size} (items {i}-{i+len(batch)-1})")
            print("Checking each item individually...")
            for j, item in enumerate(batch):
                try:
                    client.embeddings.create(model=MODEL, input=[item])
                except Exception as sub_e:
                    print(f"  🔸 Failed on index {i+j}: {repr(item)[:500]}")
                    print("  Type:", type(item))
                    print("  Length:", len(item))
                    raise sub_e
            raise e
    return np.array(embeddings)

# --- Prepare Text Fields ---
overview_texts = (
    movies["overview"]
    .fillna("No overview available")
    .astype(str)
    .apply(lambda x: x.strip())
    .tolist()
)

# Replace any remaining empty strings
overview_texts = [t if t else "No overview available" for t in overview_texts]

feature_texts = (
    movies.apply(
        lambda row: f"Genres: {row['genres']}. Cast: {row['cast']}. Director: {row['director']}.",
        axis=1,
    )
    .fillna("No metadata available")
    .astype(str)
    .apply(lambda x: x.strip())
    .tolist()
)

feature_texts = [t if t else "No features available" for t in feature_texts]

# --- Get embeddings from OpenAI ---
print("🔹 Embedding overviews...")
overview_embeddings = get_embeddings(overview_texts)

print("🔹 Embedding metadata...")
feature_embeddings = get_embeddings(feature_texts)

# --- Combine both sets ---
combined_embeddings = alpha * overview_embeddings + beta * feature_embeddings
combined_embeddings = combined_embeddings.astype("float32")  
faiss.normalize_L2(combined_embeddings)

# --- Build & Save FAISS Index ---
dim = combined_embeddings.shape[1]
index = faiss.IndexFlatIP(dim)
index.add(combined_embeddings)
faiss.write_index(index, "movie_index.faiss")

# --- Save movie data ---
movies.to_json("movies_precomputed.json", orient="index")

print("✅ Done! Saved FAISS index and movie data using OpenAI embeddings.")
