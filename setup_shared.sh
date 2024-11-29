#!/bin/bash

rm -rf shared_models/migrations
rm -rf auth/users/migrations
rm -rf chat/main/migrations
rm -rf user_management/friends/migrations
rm -rf user_management/game/migrations
rm -rf user_management/tournaments/migrations
rm -rf user_management/users/migrations


rm -rf auth/shared_models chat/shared_models user_management/shared_models
cp -r shared_models/ auth/shared_models/
cp -r shared_models/ chat/shared_models/
cp -r shared_models/ user_management/shared_models/