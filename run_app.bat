@echo off
title FieldOps Tracking System
echo ===================================================
echo Starting FieldOps Tracking System Server...
echo ===================================================
echo Opening web application in your default browser...
start http://localhost:8000/client/
python serve.py 8000
pause
