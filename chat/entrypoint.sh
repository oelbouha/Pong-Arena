#!/bin/bash

# source env/bin/activate
pip3 install -r requirements.txt
 
./django makemigrations
./django migrate

./django makemigrations main -n chat
./django migrate main

exec ./django runserver 0.0.0.0:8081