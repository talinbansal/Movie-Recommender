import pandas as pd
import faiss
import json
import numpy as np
from sentence_transformers import SentenceTransformer

alpha = 0.6
beta = 0.4

# Load Movie Data
with open('movie_dataset.json', 'r') as f:
    data = json.load(f)

movies = pd.DataFrame.from_dict(data, orient='index')

# Load SentenceTransformer model (local only)
model = SentenceTransformer('models/all-MiniLM-L6-v2')

# Compute overview embeddings
overview_embeddings = model.encode(
    movies["overview"].tolist(),
    normalize_embeddings=True
)

# Combine metadata into text
def combine_features(row):
    return f"Genres: {row['genres']}. Cast: {row['cast']}. Director: {row['director']}."

feature_texts = movies.apply(combine_features, axis=1).tolist()

# Compute feature embeddings
feature_embeddings = model.encode(
    feature_texts,
    normalize_embeddings=True
)

# Combine both sets
combined_embeddings = alpha * overview_embeddings + beta * feature_embeddings
faiss.normalize_L2(combined_embeddings)

# Save FAISS index
dim = combined_embeddings.shape[1]
index = faiss.IndexFlatIP(dim)
index.add(combined_embeddings)

faiss.write_index(index, "movie_index.faiss")

# Save movie data
movies.to_json("movies_precomputed.json", orient="index")

print("✅ Saved FAISS index and precomputed movie data!")
