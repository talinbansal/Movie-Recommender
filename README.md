# 🍿 Popcorn Pick – Movie Recommendation App

Popcorn Pick is a personalized movie discovery web app that uses **semantic analysis** to recommend similar films based on movie overviews and genres.  
It combines machine learning, full-stack web development, and scalable deployment practices into one integrated system.

---

## 🚀 Features

- 🎬 **AI-Powered Recommendations** – Uses Sentence Transformer (`all-MiniLM-L6-v2`) embeddings + FAISS vector search to find semantically similar movies  
- 🔐 **User Accounts** – Authentication, watchlists, ratings, and comments  
- ⚡ **Fast Search** – Optimized API responses (<200ms) and real-time recommendations (<5s for 50+ titles)  
- 🗃️ **Scalable Backend** – Flask + PostgreSQL with caching and session management  
- 🖼️ **Cloud Integration** – AWS S3 for media storage  
- 💻 **Modern UI** – React + TypeScript + Tailwind CSS frontend for a responsive, elegant interface  
- ☁️ **Continuous Deployment** – Hosted on Render with persistent PostgreSQL database

---

## 🧠 Tech Stack

**Frontend:**  
- React  
- TypeScript  
- Tailwind CSS  

**Backend:**  
- Python (FastAPI)  
- FAISS  
- Sentence Transformers (`all-MiniLM-L6-v2`)  
- PostgreSQL  

**Infrastructure:**  
- Render (Hosting)  
- AWS S3 (Media Storage)

---

## ⚙️ Installation (Local Setup)

```bash
# Clone the repo
git clone https://github.com/talinbansal/ML-Project.git
cd ML-Project

# Backend setup
cd backend
pip install -r requirements.txt
flask run

# Frontend setup
cd my-app
npm install
npm start
