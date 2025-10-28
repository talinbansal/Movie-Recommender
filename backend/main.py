## Flask Imports
from flask import Flask, session, jsonify, request
from werkzeug.utils import secure_filename
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from datetime import timedelta
import time 
import bcrypt
import requests 
from flask_cors import CORS
from db import conn, s3, BUCKET
import logging
import secrets
from model import vectorize
logging.basicConfig(level=logging.DEBUG)

import pandas as pd

## Flask App Initialization
app = Flask(__name__, instance_relative_config=True)
CORS(app, supports_credentials=True)  #origins=["http://localhost:5173"]

SECRET_KEY = os.getenv("SECRET_KEY")

secret_key = SECRET_KEY
app.secret_key = secret_key
app.permanent_session_lifetime = timedelta(hours=1)

app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=True  # only False on localhost
)

load_dotenv()

# TMDB API key
API_KEY = os.getenv("API_KEY")
API_TOKEN = os.getenv("API_TOKEN")

@app.route("/")
def health():
    return "Backend is alive!"

## Endpoint for Session Check
@app.route('/check_session', methods=['GET'])
def check_session():
    if "user" in session:
        return jsonify({"loggedIn": True, "user": session["user"]})
    return jsonify({"loggedIn": False})

## API Endpoint for search_bar.tsx
@app.route('/recommend', methods=['GET'])
def recommend():
    movie_data = {}
    target = request.args.get('title')
    formatted = target.title().replace(" ", "+")
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = f'https://api.themoviedb.org/3/search/movie?query={formatted}'
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        movie_id = response.json()['results'][0]['id']
        id_url = f'https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits'
        id_resp = requests.get(id_url, headers=headers)
        
        if id_resp.status_code == 200:
            data = id_resp.json()
            movie_data["overview"] = data.get('overview')
            movie_data["genres"] = [genre.get('name') for genre in data.get('genres', [])]
            for crew_member in data.get("credits", {}).get("crew", [{}]):
                if crew_member.get("job") == "Director":
                    movie_data["director"] = crew_member.get("name")
                    break
            movie_data["cast"] = [cast.get("name") for cast in data.get("credits", {}).get("cast", [{}])[:5]]
            
            recommendations = vectorize(movie_data)
        return jsonify({"recommendations": recommendations})
    
    return jsonify({"error": "Could not retrieve movie information"}), 500
    

## API Endpoint for api.tsx & movie.tsx
@app.route('/search_recommended', methods=['GET'])
def search_api():
    movies = request.args.getlist('movies')
    return jsonify({"details": details(movies)})

def details(movies):
    movie_details = []
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    
    for title in movies:
        posters = {}
        formatted = title.title().replace(" ", "+")
        url = f'https://api.themoviedb.org/3/search/movie?query={formatted}'
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            tmdb_data = response.json()
            movie_id = tmdb_data['results'][0]['id']
            
            id_url = f'https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits'
            id_resp = requests.get(id_url, headers=headers)
            
            data = id_resp.json()
            if data.get('poster_path') != None:
                posters["id"] = data.get('id')
                posters["genres"] = [genre.get('name') for genre in data.get('genres', [])]
                for crew_member in data.get("credits", {}).get("crew", [{}]):
                    if crew_member.get("job") == "Director":
                        posters["director"] = crew_member.get("name")
                        break
                posters["title"] = data.get('title')
                posters["poster_path"] = data.get('poster_path')
                posters["backdrop_path"] = data.get('backdrop_path')
                posters["overview"] = data.get('overview')
                posters["release_date"] = data.get('release_date')
                movie_details.append(posters)
    return movie_details  

@app.route("/search_fav_movie", methods=["GET"])  
def fav_movie():
    movie = []
    movie_details = {}
    movie_name = request.args.get('movie')
    formatted = movie_name.title().replace(" ", "+")
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = f'https://api.themoviedb.org/3/search/movie?query={formatted}'
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        movie_data = data['results'][0]
        if movie_data:
            movie_details["id"] = movie_data.get('id')
            movie_details["title"] = movie_data.get('title')
            movie_details["poster_path"] = movie_data.get('poster_path')
            movie.append(movie_details)
            return jsonify({"movie": movie})
        else:
            return jsonify({"error": "Movie not found"}), 404
    
def id_to_title(id):
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    
    url = f'https://api.themoviedb.org/3/movie/{id}'
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
    return data['title']
    

@app.route("/get_title", methods=["GET"])
def get_title():
    id = request.args.get('id')
    title = id_to_title(id)
    return jsonify({"title": title})
    
## Watchlist Table Endpoints

@app.route("/get_latest_releases", methods=["GET"])
def get_latest_releases():
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = 'https://api.themoviedb.org/3/movie/now_playing'
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        movie_details = []
        data = response.json()
        movies = data.get("results")
        
        for movie in movies:
            movie_info = {}
            
            movie_info["id"] = movie.get("id")
            movie_info["title"] = movie.get("title")
            movie_info["backdrop_path"] = movie.get("backdrop_path")
            
            movie_details.append(movie_info)    
    return jsonify({"latest": movie_details})

@app.route("/load_genres", methods=["GET"])
def load_genres():
    username = session.get("user")
    url = f"https://api.themoviedb.org/3/genre/movie/list?api_key={API_KEY}"
    response = requests.get(url)
    genre_ids = {}
    
    if response.status_code == 200:
        genres = response.json()
        
        for genre in genres.get("genres", []):
            genre_ids[genre["name"]] = genre["id"]
    return jsonify({"genres": genre_ids, "user": username})

@app.route("/genre_sort", methods=["GET"])
def by_genre():
    genre_id = request.args.get('genre')
    page_num = request.args.get('page', default=1, type=int)
    nums = [page_num, page_num+1]
    movies = []
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    for i in nums:
        url = f"https://api.themoviedb.org/3/discover/movie?with_genres={genre_id}&sort_by=popularity.desc&page={i}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
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
                    movie_info = {}
                    movie_info["id"] = movie.get("id")
                    movie_info["title"] = movie.get("title")
                    movie_info["poster_path"] = movie.get("poster_path")
                    movies.append(movie_info)
        else:
            # Always return something even if request fails
            return jsonify({"error": f"TMDb request failed with status {response.status_code}"})
    return jsonify({"by_genre": movies})

@app.route("/trending", methods=["GET"])
def trending():
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        movie_details = []
        data = response.json()
        movies = data.get("results")
        
        for movie in movies:
            details_dict = {}
            details_dict["title"] = movie.get("title")
            details_dict["poster_path"] = movie.get("poster_path")
            details_dict["movie_id"] = movie.get("id")
            
            movie_details.append(details_dict)
    return jsonify({"trending": movie_details})

@app.route("/top_rated", methods=["GET"])
def top_rated():
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        movie_details = []
        data = response.json()
        movies = data.get("results")
        
        for movie in movies:
            details_dict = {}
            details_dict["title"] = movie.get("title")
            details_dict["poster_path"] = movie.get("poster_path")
            details_dict["movie_id"] = movie.get("id")
            
            movie_details.append(details_dict)
    return jsonify({"rated": movie_details})

@app.route("/more_top_rated", methods=["GET"])
def more_top_rated():
    page_num = request.args.get('page_num', default=1, type=int)
    headers = {
        'Authorization': f"Bearer {API_TOKEN}"
    }
    url = f"https://api.themoviedb.org/3/movie/top_rated?language=en-US&page={page_num}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        movie_details = []
        data = response.json()
        movies = data.get("results")
        
        for movie in movies:
            details_dict = {}
            details_dict["title"] = movie.get("title")
            details_dict["poster_path"] = movie.get("poster_path")
            details_dict["movie_id"] = movie.get("id")
            
            movie_details.append(details_dict)
    return jsonify({"rated": movie_details})

@app.route("/get_user_data", methods=["GET"])
def user_data():
    user = session.get("user")
    
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
        
        return jsonify({"user_data": [genres_list, movies_list]})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
        
@app.route("/get_user_stats", methods=["GET"])
def user_stats():
    user_id = session.get("user_id")
    ratings = []
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'SELECT rating, movie_id FROM ratings WHERE user_id=%s', (str(user_id),)
        )
        
        rows = cur.fetchall()
        num_ratings = len(rows)
        max_rating = 0
        max_rating_movie = ""
        
        for row in rows:
            if row[0] > max_rating:
                max_rating = row[0]
                max_rated_movie_id = row[1]
            
        max_rated_movie = id_to_title(max_rated_movie_id) if max_rating > 0 else ""
        
        conn.commit()
        cur.close()
        
        return jsonify({"user_stats": [num_ratings, [max_rated_movie, max_rating]]})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
        
@app.route("/add_to_watchlist", methods=["POST", "GET"])
def add_to_watchlist():
    user = session.get("user_id")
    title = request.args.get('title')
    poster_path = request.args.get('poster_path')
    genres = request.args.get('genres')
    id = request.args.get('id')
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'INSERT INTO watchlist (title, poster_path, genres, movie_id, user_id) VALUES (%s, %s, %s, %s, %s)',
            (title, poster_path, genres, id, user)
        )
        
        conn.commit()
        cur.close()
        
        return jsonify({"message": "added"})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/remove_from_watchlist", methods=["POST", "GET"])
def remove_from_watchlist():
    user = session.get("user_id")
    title = request.args.get('title')
    poster_path = request.args.get('poster_path')
    genres = request.args.get('genres')
    id = request.args.get('id')
    
    try:
        cur = conn.cursor()
        
        cur.execute(
            'DELETE FROM watchlist WHERE title=%s AND poster_path=%s AND genres=%s AND user_id=%s',
            (title, poster_path, genres, user)
        )
        
        conn.commit()
        cur.close()
        
        return jsonify({"message": "removed"})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/check_watchlist", methods=["GET"])
def check_watchlist():
    user = session.get("user_id")
    poster_path = request.args.get('poster_path')
    
    try:
        cur = conn.cursor()
        
        cur.execute(
        "SELECT EXISTS(SELECT 1 FROM watchlist WHERE poster_path=%s AND user_id=%s)",
        (poster_path, user)
        )
        
        conn.commit()
        
        result = cur.fetchone()[0]
        cur.close()
        
        return jsonify({"exists": result})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/get_watchlist", methods=["GET"])
def fetch_movies():
    user = session.get("user_id")
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM watchlist WHERE user_id=%s", (user,))
        
        rows = cur.fetchall()
        cur.close()
        
        watchlist = [{"title": row[1], "poster_path": row[2], "genres": row[3], "id": row[4]} for row in rows]
        
        return jsonify({"watchlist": watchlist})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
    
## Users Table Endpoints
@app.route("/search_user", methods=["GET"])
def search_user():
    password_plain = request.args.get('password')
    username = request.args.get('username')
    
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
            return jsonify({"exists": False})
        
        user = row[0]
        stored_hash = row[1].encode('utf-8')  
        password_bytes = password_plain.encode('utf-8')
        
        if bcrypt.checkpw(password_bytes, stored_hash):
            session.permanent = True
            session["user_id"] = user
            session["user"] = username
            response = jsonify({"exists": True, "user": username})
            
            return response
        else:
            return jsonify({"exists": False})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
@app.route("/logout", methods=["POST", "GET"])
def logout():
    if "user" in session:
        session.clear()

    response = jsonify({"message": "Logged out successfully"})
    response.set_cookie('session', '', expires=0, samesite='Lax', secure=True)
    
    return response, 200
            
@app.route("/add_user_complete", methods=["POST", "GET"])
def add_user_complete():
    user = session.get("user")
    file = request.files.get('file')
    username = request.form.get('username')
    password_plain = request.form.get('password')
    genres = request.form.get('genres')
    genres_dict = json.loads(genres) if genres else []
    movies = request.form.get('movies')
    movies_list = json.loads(movies) if movies else []
    
    hashed = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt())
    
    filename = secure_filename(file.filename)
    s3_key = f"profile_pics/{username}/{filename}"
    s3.upload_fileobj(file, BUCKET, s3_key)
    profile_pic_url = f"https://{BUCKET}.s3.amazonaws.com/{s3_key}"
    
    try:
        cur = conn.cursor()
        
        # Check if user exists first
        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        exists = cur.fetchone() is not None
        
        cur.execute(
        'INSERT INTO users (password, username, fav_genres, fav_movies, profile_pic) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (username) DO UPDATE SET fav_genres = EXCLUDED.fav_genres, fav_movies = EXCLUDED.fav_movies, profile_pic = EXCLUDED.profile_pic RETURNING xmax',
            (hashed.decode('utf-8'), username, json.dumps(genres_dict), json.dumps(movies_list), profile_pic_url)
        )
        
        row = cur.fetchone()
        message = "updated" if exists else "added"
        
        conn.commit()
        cur.close()

        return jsonify({"message": message})
    
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
        
    
@app.route("/add_user", methods=["POST", "GET"])
def add_user():
    setup = request.args.get('setup')
    username = request.args.get('username')
    if setup != "exists":
        password_plain = request.args.get('password')
        hashed = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt())
    
    try:
        if setup == "false":
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

            return jsonify({"message": message})
        elif setup == "exists":
            genres = request.args.get('genres')
            genres_dict = json.loads(genres) if genres else {}
            movies_json = request.args.get("movies")
            movies_list = json.loads(movies_json) if movies_json else []
            
            cur = conn.cursor()
            
            cur.execute(
            'UPDATE users SET fav_genres=%s, fav_movies=%s WHERE username=%s',
                (json.dumps(genres_dict), json.dumps(movies_list), username)
            )
            
            message = "updated"

            conn.commit()
            cur.close()

            return jsonify({"message": message})
        else:
            genres = request.args.get('genres')
            genres_dict = json.loads(genres) if genres else {}
            movies_json = request.args.get("movies")
            movies_list = json.loads(movies_json) if movies_json else []
            
            cur = conn.cursor()
            
            cur.execute(
            'INSERT INTO users (password, username, fav_genres, fav_movies, profile_pic) VALUES (%s, %s, %s, %s, %s)',
                (hashed.decode('utf-8'), username, json.dumps(genres_dict), json.dumps(movies_list), "")
            )
            
            message = "added"

            conn.commit()
            cur.close()

            return jsonify({"message": message})
            
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
@app.route("/delete_user", methods=["DELETE"])
def delete_user():
    user = session.get("user")
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
        
        session.clear()
        
        return jsonify({"message": "deleted"})
    except Exception as e:
        logging.error(f"Error deleting user: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()


@app.route("/update_comments", methods=["POST", "GET"])
def update_comments():
    user = session.get("user")
    current_time = datetime.now().strftime("%d-%m-%Y")
    comments = request.args.get('comment')
    movie_id = request.args.get('movie_id')
    
    try:
        cur = conn.cursor()
        
        cur.execute("INSERT INTO comments (username, comment_text, created_at, movie_id) VALUES (%s, %s, %s, %s)", (user, comments, current_time, movie_id))
        
        conn.commit()
        cur.close()
        
        return jsonify({"message": "added"})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/fetch_comments", methods=["GET"])
def fetch_comments():
    movie_id= request.args.get('movie_id')
    user = session.get("user")
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM comments WHERE movie_id=%s ORDER BY created_at DESC", (movie_id,))
        
        rows = cur.fetchall()
        cur.close()
        
        if rows:
            comments = [{"username": row[1], "comment_text": row[2], "created_at": row[3]} for row in rows]
            return jsonify({"comments": comments, "user": user})
        return jsonify({"comments": [], "user": user})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/fetch_rating", methods=["GET"])
def fetch_rating():
    user = session.get("user_id")
    movie_id = request.args.get('movie_id')
    
    try:
        cur = conn.cursor()
        
        cur.execute("SELECT rating FROM ratings WHERE user_id=%s AND movie_id=%s", (str(user), movie_id))
        row = cur.fetchone()
        
        cur.execute("SELECT avg_rating FROM avg_ratings WHERE movie_id=%s", (movie_id,))
        row2 = cur.fetchone()
        cur.close()
        
        if row:
            return jsonify({"rating": row[0], "avg_rating": row2[0]})
        return jsonify({"rating": 0, "avg_rating": row2[0] if row2 else 0})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/update_user_rating", methods=["POST", "GET"])
def update_user_rating():
    user = session.get("user_id")
    movie_id = request.args.get('movie_id')
    rating = request.args.get('rating')
    
    try:
        cur = conn.cursor()
        
        cur.execute("INSERT INTO ratings (user_id, movie_id, rating) VALUES (%s, %s, %s) ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating", (user, movie_id, rating))
        
        conn.commit()
        cur.close()
        
        return jsonify({"message": "rating updated"})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()

@app.route("/update_avg_rating", methods=["GET"])
def update_avg_rating():
    movie_id = request.args.get('movie_id')
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
        
        return jsonify({"message": "average rating updated"})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
@app.route("/fetch_profile_pic", methods=["GET"])
def fetch_profile_pic():
    username = session.get("user")
    try:
        
        cur = conn.cursor()
        
        cur.execute(
        "SELECT profile_pic FROM users WHERE username=%s",
        (username,)
        )
        
        row = cur.fetchone()
        
        if row is None:
            return jsonify({"profile_pic": "https://cdn-icons-png.flaticon.com/512/149/149071.png"})
        
        profile_pic_url = row[0]
        return jsonify({"profile_pic": profile_pic_url})
    except Exception as e:
        logging.error(f"Error during user search: {e}")
        conn.rollback()
        return jsonify({"error": "Database error", "exists": False}), 500
    finally:
        if 'cur' in locals() and not cur.closed:
            cur.close()
            
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))  # use Railway's PORT or default to 5050 locally
    app.run(host="0.0.0.0", port=port, debug=True)

## Run Command flask --app main.py run --host=localhost --port=5050

