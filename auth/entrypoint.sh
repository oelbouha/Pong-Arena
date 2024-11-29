#!/bin/bash

# source env/bin/activate
pip3 install -r requirements.txt

python manage.py makemigrations
python manage.py makemigrations users shared_models -n auth

python manage.py migrate
python manage.py migrate users
python manage.py migrate shared_models

exec python3 manage.py runserver 0.0.0.0:8080