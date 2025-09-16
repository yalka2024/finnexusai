# Use official Python image as base
FROM python:3.10-slim

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port for AI service
EXPOSE 5000

# Default command (replace with your actual entrypoint if needed)
CMD ["python", "analytics.py"]
