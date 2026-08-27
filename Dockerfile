FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

# Install Python to run a simple local web server
RUN apk add --no-cache python3

# Install StateSmith CLI globally
RUN dotnet tool install -g StateSmith.Cli

# Add dotnet tools to PATH
ENV PATH="$PATH:/root/.dotnet/tools"

WORKDIR /app

# Expose port 8000 for the web server
EXPOSE 8000

# Default command: run a simple HTTP server to serve the game
CMD ["python3", "-m", "http.server", "8000"]
