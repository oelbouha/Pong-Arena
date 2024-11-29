#!/bin/bash

rm -rf data/pgsql/*

rm -rf shared_models/migrations
rm -rf auth/users/migrations
rm -rf chat/main/migrations
rm -rf user_management/friends/migrations
rm -rf user_management/game/migrations
rm -rf user_management/tournaments/migrations
rm -rf user_management/users/migrations