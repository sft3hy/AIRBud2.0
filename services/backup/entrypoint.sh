#!/bin/bash

# Set Timezone
if [ -n "$TZ" ]; then
    cp /usr/share/zoneinfo/$TZ /etc/localtime
    echo $TZ > /etc/timezone
    echo "🕒 Timezone set to $TZ"
fi

# Setup Cron Job
# Default: Wednesday at Midnight (00:00)
# Format: Min Hour Day Month DayOfWeek
CRON_SCHEDULE="${BACKUP_SCHEDULE:-0 0 * * 3}"

echo "📅 Setting up Backup Schedule: $CRON_SCHEDULE"

# Create cron job file
echo "$CRON_SCHEDULE /usr/local/bin/backup.sh >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# Create log file
touch /var/log/cron.log

# Start Cron (Foreground)
crond -f -l 8