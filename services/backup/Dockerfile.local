FROM alpine:latest

# Install dependencies
# - postgresql-client: for pg_dump
# - docker-cli: to stop/start neo4j for safe backups
# - tar/gzip: for compression
# - tzdata: for timezone management
# - bash: for the script
RUN apk add --no-cache \
    postgresql-client \
    docker-cli \
    bash \
    tzdata \
    tar \
    gzip

# Create backup directory
WORKDIR /backups

# Copy scripts
COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Make executable
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]