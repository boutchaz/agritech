#!/bin/bash
curl -s -X POST 'http://localhost:8001/api/indices/heatmap' \
  -H 'Content-Type: application/json' \
  -d '{"aoi":{"name":"test","geometry":{"type":"Polygon","coordinates":[[[2.0,48.5],[2.5,48.5],[2.5,49.0],[2.0,49.0],[2.0,48.5]]]}},"date":"2025-12-30","index":"NDVI","grid_size":100}' \
  --max-time 120
