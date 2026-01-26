import os
import multiprocessing

# Gunicorn configuration file

# Server Socket
bind = os.getenv("BIND", "0.0.0.0:8001")
backlog = 2048

# Worker Options
# For ML workloads, we balance between CPU utilization and Memory usage.
# Start with a sensible default based on CPU cores, but allow override.
cores = multiprocessing.cpu_count()
workers_per_core = float(os.getenv("GUNICORN_WORKERS_PER_CORE", "1"))
default_workers = int(workers_per_core * cores)
if default_workers < 2:
    default_workers = 2

workers = int(os.getenv("WORKERS", default_workers))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = int(os.getenv("TIMEOUT", "300"))
keepalive = 5

# Logging
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process Naming
proc_name = "parser_service"

# Preloading
# We generally do NOT preload apps using CUDA/PyTorch with Gunicorn because fork() can mess up the CUDA context.
preload_app = False
