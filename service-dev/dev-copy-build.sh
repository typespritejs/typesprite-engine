#!/bin/bash

file="./service-dev/dev-game-path.txt"
path=$(cat "$file")
echo "Target game path: $path"

sleep 1

cp -rf ./dist/index.js     $path/node_modules/typesprite/dist/index.js
if [ $? -ne 0 ]
then
    echo "❌ Failed to copy file"
    exit
fi
cp -rf ./dist/index.d.ts   $path/node_modules/typesprite/dist/index.d.ts
if [ $? -ne 0 ]
then
    echo "❌ Failed to copy file"
    exit
fi
cp -rf ./dist/index.js.map $path/node_modules/typesprite/dist/index.js.map
if [ $? -ne 0 ]
then
    echo "❌ Failed to copy file"
    exit
fi
cp -rf ./dist/index.cjs    $path/node_modules/typesprite/dist/index.cjs
if [ $? -ne 0 ]
then
    echo "❌ Failed to copy file"
    exit
fi



echo "✅ GAME-DEV-COPY"