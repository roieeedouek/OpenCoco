FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY config.py app.py ./
COPY scrapers/ scrapers/
COPY templates/ templates/
COPY static/ static/

EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "-w", "4", "--threads", "8", "--timeout", "120", "app:app"]
