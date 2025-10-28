import gzip, json, requests, time, os

batches = 7

DATA_FILE = "movie_dataset.json"

headers = {
    'Authorization': "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNThjNjI4MTNiYTY5NjkwN2U3MjM4MDg2YWU1OWFjZiIsIm5iZiI6MTc1NjQ4ODQxOC41NTUsInN1YiI6IjY4YjFlMmUyNjU5MDhiMGZhODFmZmQ5ZiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0TJwzD_cr_9adRYaZy0OR516XfyFHCTYQVNvpzK_QBA"
}

if os.path.exists(DATA_FILE):
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        details = json.load(f)
    print(f"✅ Loaded {len(details)} movies from previous run.")
else:
    details = {}
        
max_movies = 1101838
        
movies = [] ## Adding id:title pairs from json 
movies_so_far = 0  
count = 0
    
print("Getting Names")
with gzip.open("movie_ids_09_21_2025.json.gz", "rt", encoding="utf-8") as f:
    for line in f:
        count += 1
        if movies_so_far >= max_movies:
            break
        movie = json.loads(line)
        title = movie.get("original_title")
        if movie.get("popularity", 0) < 3:
            continue
        if movie.get("video") == True:
            continue
        movies.append(str(movie.get("id")))
        # print(f"Found: {title}", counter)
        movies_so_far += 1
    print(count)

print(len(movies))

count_so_far = 0

################### Filter API by Genre t get rid of wwe and PRIDE MMA stuff #####################

for batch_num in range(batches): 
    if count_so_far >= len(movies):
        break
    movie_num = 30000
    
    keywords = ["wwe", "ufc", "mma", "ecw", "wrestlemania", "pride", "bellator", "special", "collection", "concert", "tour", "muppet"]

    print("Starting Fetch")
    for index in range(count_so_far, min(count_so_far + movie_num, len(movies))):
        movie_id = movies[index]
        if str(movie_id) in details:
            continue
        
        time.sleep(0.3)  # To respect rate limits
        movie_details = {}
        url = f'https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            tmdb_data = response.json()
            
            m_title = tmdb_data.get("title")
            og_title = tmdb_data.get("original_title")
            m_lang = tmdb_data.get("original_language")
            m_genres = tmdb_data.get("genres") or []
            m_runtime = tmdb_data.get("runtime") or 0
            
            def should_skip(dataset):
                title = (dataset.get("title") or "").lower()
                lang = (dataset.get("original_language") or "").lower()
                genres = dataset.get("genres") or []
                genre_names = {genre.get("name").lower() for genre in genres}
                blocked_genres = {"documentary", "tv movie", "reality", "talk"}
                runtime = dataset.get("runtime") or 0
                return (any(k in title for k in keywords) or lang != "en" or not genres or (blocked_genres & genre_names) or runtime < 60)
            
            if should_skip(tmdb_data):
                print("filtered", m_title, og_title, m_lang, m_genres, m_runtime)
                continue
            
            # filtered Wing Commander en [{'id': 878, 'name': 'Science Fiction'}, {'id': 28, 'name': 'Action'}, {'id': 12, 'name': 'Adventure'}] 100
            
            movie_details["title"] = tmdb_data.get("title")
            movie_details["overview"] = tmdb_data.get("overview")
            movie_details["poster"] = tmdb_data.get("poster_path")
            movie_details["rating"] = tmdb_data.get("popularity")
            movie_details["release_date"] = tmdb_data.get("release_date")
            for crew_member in tmdb_data.get("credits", {}).get("crew", [{}]):
                if crew_member.get("job") == "Director":
                    movie_details["director"] = crew_member.get("name")
                    break
            movie_details["cast"] = [cast.get("name") for cast in tmdb_data.get("credits", {}).get("cast", [{}])[:5]]
            movie_details["genres"] = [genre.get("name") for genre in tmdb_data.get("genres", [])]
            details[str(movie_id)] = movie_details
            # print(f"Fetched: {movies[str(movie_id)]}")
        else: 
            print(f"Failed for movie {movie_id}: {response.status_code}")
            
        if len(details) % 500 == 0:
            with open(DATA_FILE, "w", encoding="utf-8") as out:
                json.dump(details, out, ensure_ascii=False, indent=2)
            print(f"💾 Saved progress at {len(details)} movies. Batch = {batch_num}")
    count_so_far += movie_num

with open(DATA_FILE, "w", encoding="utf-8") as out:
    json.dump(details, out, ensure_ascii=False, indent=2)
print(f"💾 Saved progress at {len(details)} movies.")

print("Done", len(details))

# curl --request GET \
#      --url 'https://api.themoviedb.org/3/movie/423' \
#      --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNThjNjI4MTNiYTY5NjkwN2U3MjM4MDg2YWU1OWFjZiIsIm5iZiI6MTc1NjQ4ODQxOC41NTUsInN1YiI6IjY4YjFlMmUyNjU5MDhiMGZhODFmZmQ5ZiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0TJwzD_cr_9adRYaZy0OR516XfyFHCTYQVNvpzK_QBA'

# curl --request GET \
#      --url 'https://api.themoviedb.org/3/movie/now_playing' \
#      --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzNThjNjI4MTNiYTY5NjkwN2U3MjM4MDg2YWU1OWFjZiIsIm5iZiI6MTc1NjQ4ODQxOC41NTUsInN1YiI6IjY4YjFlMmUyNjU5MDhiMGZhODFmZmQ5ZiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0TJwzD_cr_9adRYaZy0OR516XfyFHCTYQVNvpzK_QBA'



            
