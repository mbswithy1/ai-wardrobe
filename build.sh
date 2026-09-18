#!/bin/bash
# AI 循环衣橱 · Railway 部署构建脚本（根目录执行）
# 1. 构建前端 → web/dist
# 2. 构建后端 → server/dist
set -e

echo "[build] 构建前端..."
cd web
npm ci || npm install
npm run build
cd ..

echo "[build] 构建后端..."
cd server
npm ci || npm install
npm run build
cd ..

echo "[build] 完成"