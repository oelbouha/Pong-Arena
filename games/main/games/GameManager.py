from main.games.PingPong import PingPong
from main.games.HandSlap import HandSlap
from typing import Dict, Union, Type

import asyncio


class GamesManager:

    game_id = 0
    def __init__(self) -> None:
        self.game_sessions: Dict[int, Union[PingPong, HandSlap]] = {}


    async def create_game(self, game_class: Type[PingPong | HandSlap], match_manager, **kwargs):
        game = game_class(match_manager, **kwargs)
        game_id = GamesManager.game_id 
        self.game_sessions[game_id] = game
        GamesManager.game_id += 1
        return game_id


    async def start_game(self, id, game_class: Type[PingPong | HandSlap]):
        if id in self.game_sessions:
            if issubclass(game_class, PingPong) and self.game_sessions[id].send_game_state_task is None:
                self.game_sessions[id].send_game_state_task = asyncio.create_task(self.game_sessions[id].send_game_state())

    async def perform_an_action(self, id, action, **kwargs):
        if action == "paddle":
            p = 'p1' if kwargs['side'] == 'L' else 'p2'
            await self.game_sessions[id].update_paddles(p, kwargs['direction'])
        elif action == "attack":
            p = 'p1' if kwargs['side'] == 'T' else 'p2'
            await self.game_sessions[id].attack(p)
        elif action == "retreat":
            p = 'p1' if kwargs['side'] == 'T' else 'p2'
            await self.game_sessions[id].retreat(p)


        



    async def remove_game(self, game_id):
        try:
            del self.game_sessions[game_id]
        except KeyError:
            pass