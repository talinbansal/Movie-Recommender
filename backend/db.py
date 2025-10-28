import psycopg2
import boto3
from urllib.parse import urlparse
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")
url = urlparse(DATABASE_URL) # Parse the database URL

# Establish the connection
conn = psycopg2.connect(
    dbname=url.path[1:],
    user=url.username,
    password=url.password, 
    host=url.hostname,
    port=url.port
)

# AWS S3
s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)
BUCKET = os.getenv("S3_BUCKET_NAME")