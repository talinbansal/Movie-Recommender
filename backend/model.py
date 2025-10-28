import pandas as pd
import faiss
import json

from sentence_transformers import SentenceTransformer

model = None
movies = None
index = None
alpha = 0.6
beta = 0.4
    
def load():
    global model, movies, index

    # Load Movie Data
    with open('movie_dataset.json', 'r') as f:
        data = json.load(f)

    movies = pd.DataFrame.from_dict(data, orient='index')

    # Load sentence transformer model once
    model = SentenceTransformer('all-MiniLM-L6-v2')
    overview_embeddings = model.encode(
        movies["overview"].tolist(),
        normalize_embeddings=True
    )

    def combine_features(row):
        return f"Genres: {row['genres']}. Cast: {row['cast']}. Director: {row['director']}."

    feature_texts = movies.apply(combine_features, axis=1).tolist()
    feature_embeddings = model.encode(
        feature_texts,
        normalize_embeddings=True
    )

    combined_embeddings = alpha * overview_embeddings + beta * feature_embeddings
    faiss.normalize_L2(combined_embeddings)

    dim = combined_embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(combined_embeddings)

    print("✅ Model + Index fully loaded!")

def vectorize(searched, top_k=50):
    query_text = f"Genres: {searched['genres']}. Director: {searched['director']}. Cast: {searched['cast']}."
    
    overview_vec = model.encode([searched["overview"]], normalize_embeddings=True)
    feature_vec = model.encode([query_text], normalize_embeddings=True)
    
    query_vec = alpha * overview_vec + beta * feature_vec
    faiss.normalize_L2(query_vec)
    
    scores, indices = index.search(query_vec, top_k)

    top_indices = indices[0]
    sims = scores[0]
    best_indices = top_indices[sims.argsort()[::-1]]

    return [movies.iloc[i]['title'] for i in best_indices]
