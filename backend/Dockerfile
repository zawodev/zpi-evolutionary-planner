FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y sqlite3 libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# create data directory for db
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && python manage.py seed_demo_data && python manage.py runserver 0.0.0.0:8000"]