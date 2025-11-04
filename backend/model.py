import os
import faiss
import numpy as np
import pandas as pd
import openai
import json

alpha = 0.6
beta = 0.4

# Load precomputed data
with open("movies_precomputed.json", "r") as f:
    data = json.load(f)

movies = pd.DataFrame.from_dict(data, orient="index")
index = faiss.read_index("movie_index.faiss")

openai.api_key = os.getenv("OPENAI_API_KEY")

def get_openai_embedding(text):
    """Embed text using OpenAI instead of SentenceTransformer"""
    response = openai.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return np.array(response.data[0].embedding, dtype="float32")

def vectorize(searched, top_k=50):
    # Combine user query the same way you did locally
    query_text = f"Genres: {searched['genres']}. Director: {searched['director']}. Cast: {searched['cast']}."
    overview_text = searched.get("overview", "")

    # Get OpenAI embeddings for query parts
    overview_vec = get_openai_embedding(overview_text)
    feature_vec = get_openai_embedding(query_text)

    query_vec = alpha * overview_vec + beta * feature_vec
    query_vec = np.expand_dims(query_vec, axis=0)
    faiss.normalize_L2(query_vec)

    scores, indices = index.search(query_vec, top_k)

    best = indices[0]
    return [movies.iloc[i]['title'] for i in best]
