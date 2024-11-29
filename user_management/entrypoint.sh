#!/bin/bash

# source env/bin/activate
pip3 install -r requirements.txt

# ./django makemigrations
# ./django migrate
echo "MAKING MIGRATIONS"
./django makemigrations users friends game tournaments -n management

echo "MIGRATING Users"
./django migrate users

echo "MIGRATING Friends"
./django migrate friends

echo "MIGRATING Games"
./django migrate game

echo "MIGRATING Tournaments"
./django migrate tournaments

exec ./django runserver 0.0.0.0:8080