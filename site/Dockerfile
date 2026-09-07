# Production Dockerfile for FieldOps
FROM python:3.13-alpine

WORKDIR /app

# Copy application files
COPY . /app

# Expose standard HTTP port
EXPOSE 8000

ENV PORT=8000

# Start production server
CMD ["python", "serve.py", "8000"]
