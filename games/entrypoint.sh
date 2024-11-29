#!/bin/bash

# source env/bin/activate
pip3 install -r requirements.txt

exec daphne -b 0.0.0.0 -p 8080 game.asgi:application