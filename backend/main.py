from werkzeug.utils import secure_filename
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from datetime import timedelta
import bcrypt
import requests 
from db import conn, s3, BUCKET
import logging
import model
from fastapi import FastAPI, Query, HTTPException, Request, APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions  import SessionMiddleware
import uvicorn
import httpx
import asyncio
from pydantic import BaseModel
logging.basicConfig(level=logging.DEBUG)

import pandas as pd

## FastAPI App Initialization
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.popcornpick.app"],          # <-- any domain can access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY")

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=3600,  # 1 hour
    same_site="lax",
    https_only=True  # set to False only for localhost
)

load_dotenv()

# TMDB API key
API_KEY = os.getenv("API_KEY")
API_TOKEN = os.getenv("API_TOKEN")

@app.get("/")
def health():
    return "Backend is alive!"

## Endpoint for Session Check
@app.get('/check_session')
async def check_session(request: Request):
    user = request.session.get("user")
    if user:
        return {"loggedIn": True, "user": user}
    return {"loggedIn": False}

## API Endpoint for search_bar.tsx
@app.get('/recommend')
async def recommend(title: str = Query(..., description="Movie title to get recommendations for")):
    formatted = title.title().replace(" ", "+")
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1️⃣ Get movie ID from TMDB
        search_url = f"https://api.themoviedb.org/3/search/movie?query={formatted}"
        search_resp = await client.get(search_url, headers=headers)

        if search_resp.status_code != 200 or not search_resp.json().get("results"):
            raise HTTPException(status_code=500, detail="Could not retrieve movie information")

        movie_id = search_resp.json()["results"][0]["id"]

        # 2️⃣ Fetch detailed info + credits concurrently
        id_url = f"https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits"
        id_resp = await client.get(id_url, headers=headers)

        if id_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Could not retrieve movie details")

        data = id_resp.json()

    # 3️⃣ Extract relevant movie data
    movie_data = {
        "overview": data.get("overview"),
        "genres": [g.get("name") for g in data.get("genres", [])],
        "cast": [c.get("name") for c in data.get("credits", {}).get("cast", [])[:5]],
        "director": next(
            (crew.get("name") for crew in data.get("credits", {}).get("crew", []) if crew.get("job") == "Director"),
            None,
        ),
    }

    # 4️⃣ Run your model.vectorize() without blocking event loop
    recommendations = await asyncio.to_thread(model.vectorize, movie_data)

    # 5️⃣ Return JSON response
    return JSONResponse(content={"recommendations": recommendations})
    

## API Endpoint for api.tsx & movie.tsx
@app.get('/search_recommended')
async def search_api(movies: list[str] = Query(..., description="List of movie titles")):
    result = await details(movies)
    return {"details": result}

async def details(movies):
    movie_details = []
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for title in movies:
            formatted = title.title().replace(" ", "+")
            url = f'https://api.themoviedb.org/3/search/movie?query={formatted}'
            response = await client.get(url, headers=headers)

            
            if response.status_code != 200 or not response.json().get("results"):
                raise HTTPException(status_code=500, detail="Could not retrieve movie information")
            
            tmdb_data = response.json()
            movie_id = tmdb_data['results'][0]['id']
            
            id_url = f'https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits'
            id_resp = await client.get(id_url, headers=headers)
            
            
            if id_resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Could not retrieve movie information")
            
            data = id_resp.json()
            
            if data.get('poster_path'):
                posters = {
                    "id": data.get("id"),
                    "title": data.get("title"),
                    "poster_path": data.get("poster_path"),
                    "backdrop_path": data.get("backdrop_path"),
                    "overview": data.get("overview"),
                    "release_date": data.get("release_date"),
                    "genres": [g.get("name") for g in data.get("genres", [])],
                    "director": next(
                        (
                            crew.get("name")
                            for crew in data.get("credits", {}).get("crew", [])
                            if crew.get("job") == "Director"
                        ),
                        None,
                    ),
                }
                movie_details.append(posters)
        return movie_details  

@app.get("/search_fav_movie")  
async def fav_movie(movie: str = Query(..., description="Favorite movie title")):
    movie_list = []
    formatted = movie.title().replace(" ", "+")
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = f'https://api.themoviedb.org/3/search/movie?query={formatted}'
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
    
    if response.status_code != 200 or not response.json().get("results"):
        raise HTTPException(status_code=500, detail="Could not retrieve movie information")
    
    data = response.json()
    results = data.get('results')
    
    if not results:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    movie_data = results[0]
    
    movie_details = {
        "id": movie_data.get('id'),
        "title": movie_data.get('title'),
        "poster_path": movie_data.get('poster_path')
    }
    
    movie_list.append(movie_details)
    return {"movie": movie_list}
    
async def id_to_title(id):
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    
    url = f'https://api.themoviedb.org/3/movie/{id}'
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not retrieve movie information")
        
    data = response.json()
    return data.get("title", "Unknown Title")


@app.get("/get_title")
async def get_title(id: str = Query(..., description="Movie ID")):
    title = await id_to_title(id)
    return {"title": title}
    
## Watchlist Table Endpoints

@app.get("/get_latest_releases")
async def get_latest_releases():
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = 'https://api.themoviedb.org/3/movie/now_playing'
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not retrieve movie information")
    
    movie_details = []
    data = response.json()
    movies = data.get("results")
    
    for movie in movies:
        movie_info = {
        "id": movie.get("id"),
        "title": movie.get("title"),
        "backdrop_path":movie.get("backdrop_path")
    }
        
    movie_details.append(movie_info)    
    return {"latest": movie_details}

@app.get("/load_genres")
async def load_genres(request: Request):
    username = request.session.get("user")
    url = f"https://api.themoviedb.org/3/genre/movie/list?api_key={API_KEY}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not retrieve genre information")
        
    genres = response.json()
    
    genre_ids = {}
    for genre in genres.get("genres", []):
        genre_ids[genre["name"]] = genre["id"]
    return {"genres": genre_ids, "user": username}

@app.get("/genre_sort")
async def by_genre(genre: str = Query(..., description="Genre ID"), page: int = Query(1, description="Page number")):
    genre_id = genre
    page_num = page
    nums = [page_num, page_num+1]
    movies = []
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    
    for i in nums:
        url = f"https://api.themoviedb.org/3/discover/movie?with_genres={genre_id}&sort_by=popularity.desc&page={i}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Could not retrieve movie information")
            
        data = response.json()
        
        bad_keywords = [
        "sex", "sexual", "seduce", "seduction", "paedophilia", "pedo", "porn", "xxx", "erotic", "adult", "stepparent", "stepmom", "stepdad"
        ]
        
        languages = ["en"]
        
        for movie in data.get("results", []):
            title_lower = (movie.get("title") or "").lower()
            overview_lower = (movie.get("overview") or "").lower()
            poster = movie.get("poster_path")
            
            if (poster) and (not movie.get("adult")) and not any(k in title_lower or k in overview_lower for k in bad_keywords) and (movie.get("original_language") in languages):
                movie_info = {
                    "id": movie.get("id"),
                    "title": movie.get("title"),
                    "poster_path": movie.get("poster_path")
                }
                
                movies.append(movie_info)
    return {"by_genre": movies}

@app.get("/trending")
async def trending():
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not retrieve movie information")
        
    movie_details = []
    data = response.json()
    movies = data.get("results")
    
    for movie in movies:
        details_dict = {
            "title": movie.get("title"),
            "poster_path": movie.get("poster_path"),
            "movie_id": movie.get("id")
        }
        
        movie_details.append(details_dict)
        
    return {"trending": movie_details}

@app.get("/top_rated")
async def top_rated():
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not retrieve movie information")
        
    movie_details = []
    data = response.json()
    movies = data.get("results")
    
    for movie in movies:
        details_dict = {
            "title": movie.get("title"),
            "poster_path": movie.get("poster_path"),
            "movie_id": movie.get("id")
        }
        
        movie_details.append(details_dict)
        
    return {"rated": movie_details}

@app.get("/more_top_rated")
async def more_top_rated(page_num: int = Query(1, description="Page number")):
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = f"https://api.themoviedb.org/3/movie/top_rated?language=en-US&page={page_num}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not retrieve movie information")
        
    movie_details = []
    data = response.json()
    movies = data.get("results")
    
    for movie in movies:
        details_dict = {
        "title": movie.get("title"),
        "poster_path": movie.get("poster_path"),
        "movie_id": movie.get("id")
        }
        
        movie_details.append(details_dict)
        
    return {"rated": movie_details}

@app.get("/get_user_data")
async def user_data(request: Request):
    user = request.session.get("user")
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'SELECT fav_genres, fav_movies FROM users WHERE username=%s', (user,)
        )
        
        row = cur.fetchone()
        genres_list = row[0]
        movies_list = row[1]
        
        conn.commit()
        cur.close()
        
        return {"user_data": [genres_list, movies_list]}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
        
@app.get("/get_user_stats")
async def user_stats(request: Request):
    user_id = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'SELECT rating, movie_id FROM ratings WHERE user_id=%s', (str(user_id),)
        )
        
        rows = cur.fetchall()
        num_ratings = len(rows)
        max_rating = 0
        max_rated_movie_id = None
        
        for row in rows:
            if row[0] > max_rating:
                max_rating = row[0]
                max_rated_movie_id = row[1]
            
        max_rated_movie = await id_to_title(max_rated_movie_id) if max_rating > 0 else ""
        
        conn.commit()
        cur.close()
        
        return {"user_stats": [num_ratings, [max_rated_movie, max_rating]]}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
        
@app.get("/add_to_watchlist")
@app.post("/add_to_watchlist")
def add_to_watchlist(request: Request, title: str = Query(...), poster_path: str = Query(...), genres: str = Query(...), id: str = Query(...)):
    user = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'INSERT INTO watchlist (title, poster_path, genres, movie_id, user_id) VALUES (%s, %s, %s, %s, %s)',
            (title, poster_path, genres, id, user)
        )
        
        conn.commit()
        cur.close()
        
        return {"message": "added"}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.get("/remove_from_watchlist")
@app.post("/remove_from_watchlist")
async def remove_from_watchlist(request: Request, title: str = Query(...), poster_path: str = Query(...), genres: str = Query(...)):
    user = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'DELETE FROM watchlist WHERE title=%s AND poster_path=%s AND genres=%s AND user_id=%s',
            (title, poster_path, genres, user)
        )
        
        conn.commit()
        cur.close()
        
        return {"message": "removed"}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()


@app.get("/check_watchlist")
async def check_watchlist(request: Request, poster_path: str = Query(...)):
    user = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute(
        "SELECT EXISTS(SELECT 1 FROM watchlist WHERE poster_path=%s AND user_id=%s)",
        (poster_path, user)
        )
        
        conn.commit()
        
        result = cur.fetchone()[0]
        cur.close()
        
        return {"exists": result}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.get("/get_watchlist")
async def fetch_movies(request: Request):
    user = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM watchlist WHERE user_id=%s", (user,))
        
        rows = cur.fetchall()
        cur.close()
        
        watchlist = [{"title": row[1], "poster_path": row[2], "genres": row[3], "id": row[4]} for row in rows]
        
        return {"watchlist": watchlist}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
class SearchUserBody(BaseModel):
    username: str
    password: str
    
## Users Table Endpoints
@app.post("/search_user")
async def search_user(body: SearchUserBody, request: Request):
    username = body.username
    password = body.password
    
    try: 
        cur = conn.cursor()
        
        cur.execute(
        "SELECT id, password FROM users WHERE username=%s",
        (username,)
        )
        
        conn.commit()
        
        row = cur.fetchone()
        cur.close()
        
        if row is None:
            return {"exists": False}
        
        user = row[0]
        stored_hash = row[1].encode('utf-8')  
        password_bytes = password.encode('utf-8')
        
        if bcrypt.checkpw(password_bytes, stored_hash):
            request.session["user_id"] = user
            request.session["user"] = username
            response = {"exists": True, "user": username}
            
            return response
        else:
            return {"exists": False}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
@app.get("/logout")
@app.post("/logout")
async def logout(request: Request):
    user = request.session.get("user")
    
    if user :
        request.session.clear()

    response = JSONResponse({"message": "Logged out successfully"}, status_code=200)
    response.delete_cookie("session", samesite="lax", secure=True)
    
    return response
            
@app.post("/add_user_complete")
async def add_user_complete(file: UploadFile | None = File(None),
    username: str | None = Form(None),
    password: str | None = Form(None),
    genres: str = Form(...),
    movies: str = Form(...)
):
    
    genres_dict = json.loads(genres) if genres else []
    movies_list = json.loads(movies) if movies else []
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()) if password else None
    
    profile_pic_url = None
    
    if file:
        filename = secure_filename(file.filename)
        s3_key = f"profile_pics/{username}/{filename}"
        s3.upload_fileobj(file.file, BUCKET, s3_key)
        profile_pic_url = f"https://{BUCKET}.s3.amazonaws.com/{s3_key}"
    
    try:
        cur = conn.cursor()
        
        if hashed:
            cur.execute(
            'INSERT INTO users (password, username, fav_genres, fav_movies, profile_pic) VALUES (%s, %s, %s, %s, %s)',
                (hashed.decode('utf-8'), username, json.dumps(genres_dict), json.dumps(movies_list), profile_pic_url)
            )
        else:
            if file and profile_pic_url:
                cur.execute(
                'UPDATE users SET fav_genres= %s, fav_movies= %s, profile_pic= %s WHERE username= %s',
                    (json.dumps(genres_dict), json.dumps(movies_list), profile_pic_url, username)
                )
            else:
                cur.execute(
                'UPDATE users SET fav_genres= %s, fav_movies= %s WHERE username= %s',
                    (json.dumps(genres_dict), json.dumps(movies_list), username)
                )
            
        conn.commit()
        cur.close()

        return JSONResponse({"message": "done"}, status_code=200)
    
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

class UserCheckBody(BaseModel):
    username: str
            
@app.post("/check_user")
async def check_user(body: UserCheckBody):
    username = body.username
    try:
        cur = conn.cursor()
        
        cur.execute(
            'SELECT * FROM users WHERE username = %s',
            (username, ) # hashed.decode('utf-8'), username
        )
        
        row = cur.fetchone()
        
        if row:
            message = "User already exists"
        else:
            message = "New user"

        conn.commit()
        cur.close()
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
class AddUserBody(BaseModel):
    setup: bool | str   
    username: str
    password: str | None = None
    genres: str | None = None
    movies: str | None = None

        
@app.post("/add_user")
async def add_user(body: AddUserBody):
    setup = body.setup
    username = body.username
    password = body.password
    genres = body.genres
    movies = body.movies
    
    if setup != "exists":
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    try:
        if setup == "exists":
            genres_dict = json.loads(genres) if genres else {}
            movies_list = json.loads(movies) if movies else []
            
            cur = conn.cursor()
            
            cur.execute(
            'UPDATE users SET fav_genres=%s, fav_movies=%s WHERE username=%s',
                (json.dumps(genres_dict), json.dumps(movies_list), username)
            )
            
            message = "updated"

            conn.commit()
            cur.close()

            return {"message": message}
        else:
            genres_dict = json.loads(genres) if genres else {}
            movies_list = json.loads(movies) if movies else []
            
            cur = conn.cursor()
            
            cur.execute(
            'INSERT INTO users (password, username, fav_genres, fav_movies, profile_pic) VALUES (%s, %s, %s, %s, %s)',
                (hashed.decode('utf-8'), username, json.dumps(genres_dict), json.dumps(movies_list), "")
            )
            
            message = "added"

            conn.commit()
            cur.close()

            return {"message": message}
            
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
@app.delete("/delete_user")
async def delete_user(request: Request):
    user = request.session.get("user")
    try: 
        cur = conn.cursor()
        
        cur.execute(
        "SELECT id FROM users WHERE username=%s",
        (user,)
        )
        
        user_id = cur.fetchone()[0]
                
        cur.execute("DELETE FROM watchlist WHERE user_id=%s", (user_id,))
        cur.execute("DELETE FROM ratings WHERE user_id=%s", (str(user_id),))
        cur.execute("DELETE FROM comments WHERE username=%s", (user,))
        cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
                
        conn.commit()
        
        request.session.clear()
        
        return {"message": "deleted"}
    except Exception as e:
        logging.error(f"Error deleting user: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()


@app.post("/update_comments")
@app.get("/update_comments")
async def update_comments(request: Request, comment: str = Query(...), movie_id: str = Query(...)):
    user = request.session.get("user")
    current_time = datetime.now().strftime("%d-%m-%Y")
    
    try:
        cur = conn.cursor()
        
        cur.execute("INSERT INTO comments (username, comment_text, created_at, movie_id) VALUES (%s, %s, %s, %s)", (user, comment, current_time, movie_id))
        
        conn.commit()
        cur.close()
        
        return {"message": "added"}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.get("/fetch_comments")
async def fetch_comments(request: Request, movie_id: str = Query(...)):
    user = request.session.get("user")
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM comments WHERE movie_id=%s ORDER BY created_at DESC", (movie_id,))
        
        rows = cur.fetchall()
        cur.close()
        
        if rows:
            comments = [{"username": row[1], "comment_text": row[2], "created_at": row[3]} for row in rows]
            return {"comments": comments, "user": user}
        return {"comments": [], "user": user}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.get("/fetch_rating")
async def fetch_rating(request: Request, movie_id: str = Query(...)):
    user = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT rating FROM ratings WHERE user_id=%s AND movie_id=%s", (str(user), movie_id))
        row = cur.fetchone()
        
        cur.execute("SELECT avg_rating FROM avg_ratings WHERE movie_id=%s", (movie_id,))
        row2 = cur.fetchone()
        cur.close()
        
        if row:
            return {"rating": row[0], "avg_rating": row2[0]}
        return {"rating": 0, "avg_rating": row2[0] if row2 else 0}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.get("/update_user_rating")
@app.post("/update_user_rating")
async def update_user_rating(request: Request, movie_id: str = Query(...), rating: float = Query(...)):
    user = request.session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute("INSERT INTO ratings (user_id, movie_id, rating) VALUES (%s, %s, %s) ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating", (user, movie_id, rating))
        
        conn.commit()
        cur.close()
        
        return {"message": "rating updated"}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.get("/update_avg_rating")
async def update_avg_rating(movie_id: str = Query(...)):
    ratings_sum = 0
    total_ratings = 0
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT rating FROM ratings WHERE movie_id=%s", (movie_id,))
        
        rows = cur.fetchall()
        if rows:
            for row in rows:
                ratings_sum += row[0]
                total_ratings += 1
            
        avg_rating = ratings_sum / total_ratings if total_ratings > 0 else 0
        
        cur.execute("""
        INSERT INTO avg_ratings (movie_id, ratings_sum, total_ratings, avg_rating) 
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (movie_id) 
            DO UPDATE 
            SET ratings_sum = EXCLUDED.ratings_sum,
                total_ratings = EXCLUDED.total_ratings,
                avg_rating = (EXCLUDED.ratings_sum) / (EXCLUDED.total_ratings);
        """, (movie_id, ratings_sum, total_ratings, avg_rating)) 
        
        conn.commit()
        cur.close()
        
        return {"message": "average rating updated"}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
@app.get("/fetch_profile_pic")
async def fetch_profile_pic(request: Request):
    username = request.session.get("user")
    try:
        
        cur = conn.cursor()
        
        cur.execute(
        "SELECT profile_pic FROM users WHERE username=%s",
        (username,)
        )
        
        row = cur.fetchone()
        
        if row is None:
            return {"profile_pic": "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
        
        profile_pic_url = row[0]
        return {"profile_pic": profile_pic_url}
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

## Run Command flask --app main.py run --host=localhost --port=5050

