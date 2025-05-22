FROM python:3.9-slim

WORKDIR /app

# install OS deps & python deps
# (you can add libpq if needed)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy source
COPY . .

# set production env
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# expose API port
EXPOSE 5000

# run Gunicorn in production
CMD ["gunicorn", "--workers", "1", "--bind", "0.0.0.0:5000", "app:app"]
