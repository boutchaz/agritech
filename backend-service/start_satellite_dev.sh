#!/bin/bash
export SATELLITE_PROVIDER="cdse"
export CDSE_CLIENT_ID="sh-d0d326a1-bf76-42b5-8ab7-fbcc4f3abf75"
export CDSE_CLIENT_SECRET="BaFw0ySSORrz6Gec4aoV7yrL3P4IE7IZ"
export CDSE_OPENEO_URL="https://openeo.dataspace.copernicus.eu"
export PYTHONUNBUFFERED=1

echo "🛰️  Starting Satellite Service (CDSE) on port 8001..."
venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload --log-level debug
