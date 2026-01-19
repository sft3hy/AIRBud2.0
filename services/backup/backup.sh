#!/bin/bash

# Configuration
BACKUP_ROOT="/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="$BACKUP_ROOT/backup_$TIMESTAMP"
ARCHIVE_NAME="backup_$TIMESTAMP.tar.gz"

echo "------------------------------------------------"
echo "🚀 Starting System Backup: $TIMESTAMP"
echo "------------------------------------------------"

mkdir -p "$BACKUP_DIR"

# 1. POSTGRESQL DUMP
# We perform a hot dump. No downtime required.
echo "📦 Dumping PostgreSQL..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
  -h postgres \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -F c \
  -f "$BACKUP_DIR/postgres_dump.sql"

if [ $? -eq 0 ]; then
  echo "✅ PostgreSQL Dump Success"
else
  echo "❌ PostgreSQL Dump Failed"
fi

# 2. NEO4J BACKUP
# For Neo4j Community Edition in Docker, the safest restore method 
# is a clean copy of the /data directory while the DB is stopped.
echo "🛑 Stopping Neo4j for safe volume snapshot..."
docker stop smart_rag_neo4j

echo "📦 Archiving Neo4j Data..."
# We utilize the volume mount at /neo4j_data which maps to the container's volume
tar -czf "$BACKUP_DIR/neo4j_data.tar.gz" -C /neo4j_data .

echo "▶️ Restarting Neo4j..."
docker start smart_rag_neo4j
echo "✅ Neo4j Snapshot Success"

# 3. SHARED DATA (Uploads, Charts, FAISS)
echo "📦 Archiving Shared Data..."
tar -czf "$BACKUP_DIR/shared_data.tar.gz" -C /shared_data .
echo "✅ Shared Data Success"

# 4. SOURCE CODE (RAG Core)
echo "📦 Archiving Source Code..."
tar -czf "$BACKUP_DIR/source_code.tar.gz" -C /source_code .
echo "✅ Source Code Success"

# 5. FINALIZE
echo "🔒 Compressing full backup bundle..."
cd "$BACKUP_ROOT"
tar -czf "$ARCHIVE_NAME" "backup_$TIMESTAMP"

# Remove the temporary uncompressed folder
rm -rf "$BACKUP_DIR"

echo "✅ Backup created: $BACKUP_ROOT/$ARCHIVE_NAME"

# 6. CLEANUP (Keep last 30 days)
echo "🧹 Cleaning up old backups (older than 30 days)..."
find "$BACKUP_ROOT" -name "backup_*.tar.gz" -mtime +30 -delete

echo "------------------------------------------------"
echo "🎉 Backup Process Complete"
echo "------------------------------------------------"