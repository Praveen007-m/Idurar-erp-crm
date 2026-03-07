@echo off
cd /d "%~dp0"
node test_bcrypt.js > test_output.txt 2>&1
type test_output.txt

