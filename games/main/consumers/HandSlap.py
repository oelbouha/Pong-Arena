from django.conf import settings
from django.db.models import Q
from django.core.exceptions import ValidationError
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from main.models import StatusChoices
from main.games import game_manager
from main.matches.utils import make_match_instance, start_method, opponent_method, error_method
from main.matches.Tournament import TournamentMatch
from main.matches.Friend import FriendMatch
from main.games.HandSlap import HandSlap
from main.consumers.Game import Game

from main.consumers import redis_instance


from shared_models.models.Match import Games

import asyncio

class HandSlapConsumer(Game):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.game_type = Games.SLAP


    async def receive_json(self, content):
        if self.match_manager is None:
            await self.create_and_setup_match(content)
        else:
            if not 'm' in content or not content['m'] in ['rd', 'attack', 'retreat']:
                content = await error_method('invalid method')
                return await self.send_json(content=content)
            else:
                if content['m'] == 'rd':
                    try:
                        hand = int(content['h'])
                    except (KeyError, ValueError):
                        hand = 1
                    return await self.handle_ready_method(hand)
                elif content['m'] in ['attack', 'retreat']:
                    return await self.handle_actions_methods(content['m'])


    async def handle_ready_method(self, hand):
        if self.match_manager.player['status'] == self.match_manager.waiting_status:
            await self.opponent_refresh()
            await self.match_manager.set_player_hand(hand)
            await self.match_manager.change_player_status(StatusChoices.READY)
            if self.match_manager.opponent['status'] == StatusChoices.READY:

                game_id = await game_manager.create_game(HandSlap, self.match_manager)

                event = await start_method(event="game.state", game_id=game_id)
                
                event['data']['hands'] = {
                    'p1': self.match_manager.player['hand'],
                    'p2': self.match_manager.opponent['hand']
                }
                event['data']['side'] = 'T'
                await self.channel_layer.send(self.match_manager.player['channel'], event)
                event['data']['side'] = 'B'
                await self.channel_layer.send(self.match_manager.opponent['channel'], event)


    async def handle_start_method(self, data):
        self.game_id = data['game_id']
        self.match_manager.side = data['side']

        content = await start_method()
        content['score'] = settings.DEFAULT_WINNING_SCORE
        if isinstance(self.match_manager, TournamentMatch):
            content['score'] = self.match_manager.winning_score

        content['side'] = self.match_manager.side
        content['hands'] = data['hands']
        content['score'] = self.match_manager.winning_score
        await self.send_json(content=content)
        await game_manager.start_game(self.game_id, HandSlap)

    
    async def handle_actions_methods(self, action):
        await game_manager.perform_an_action(self.game_id, action, side=self.match_manager.side)


    async def create_and_setup_match(self, content):
        try:
            self.match_manager = await make_match_instance(self.player, self.game_type, game_info=content)
            matched = await self.match_manager.matchmaking()

            if matched:
                if isinstance(self.match_manager, FriendMatch):
                    await self.match_manager.expire()
                    
                p1 = self.match_manager.player['user_id']
                p2 = self.match_manager.opponent['user_id']
                event = await opponent_method(p1=p1, p2=p2, event="game.state")
                self.matched = True
                await self.channel_layer.send(self.match_manager.opponent['channel'], event)
                return await self.send_json(event['data'])
            else:
                self.waiting_task = asyncio.create_task(self.waiting_for_opponent())

        except ValidationError as e:
            error = await error_method(e.message)
            return await self.send_json(error)
