from django.core.exceptions import ValidationError
from django.conf import settings

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from main.models import StatusChoices
from main.games import game_manager
from main.games.PingPong import PingPong
from main.matches.Tournament import TournamentMatch
from main.matches.utils import make_match_instance, start_method, opponent_method, error_method
from main.consumers.Game import Game
from main.matches.Friend import FriendMatch
from shared_models.models.Match import Games
import asyncio

class PingPongConsumer(Game):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.game_type = Games.PONG



    async def receive_json(self, content):
        if self.match_manager is None:
            await self.create_and_setup_match(content)
        else:
            if not 'm' in content or not content['m'] in ['rd', 'up', 'down', 'meta']:
                content = await error_method('invalid method')
                return await self.send_json(content=content)
            
            else:
                if content['m'] == 'rd':
                    return await self.handle_ready_method()
                elif content['m'] in ['up', 'down']:
                    return await self.handle_actions_methods(content['m'])
                elif content['m'] == 'meta':
                    game_info = await self.get_game_info()
                    await self.send_json({
                        'm': 'meta',
                        'meta': game_info
                    })


    async def handle_ready_method(self):
        if self.match_manager.player['status'] == self.match_manager.waiting_status:
            await self.opponent_refresh()
            await self.match_manager.change_player_status(StatusChoices.READY)
            if self.match_manager.opponent['status'] == StatusChoices.READY:
                game_id = await game_manager.create_game(PingPong, self.match_manager)
                event = await start_method(event="game.state", game_id=game_id)

                event['data']['side'] = 'L' if self.match_manager.player['user_id'] == self.player_ else 'R'
                await self.channel_layer.send(self.match_manager.player['channel'], event)
                event['data']['side'] = 'R' if event['data']['side'] == 'L' else 'L'
                await self.channel_layer.send(self.match_manager.opponent['channel'], event)


    async def handle_start_method(self, data):
        self.game_id = data['game_id']
        self.match_manager.side = data['side']


        content = await start_method()
        content['side'] = self.match_manager.side
        content['score'] = self.match_manager.winning_score
        await self.send_json(content=content)
        await game_manager.start_game(self.game_id, PingPong)

    
    async def handle_actions_methods(self, action):
        direction = -1 if action == 'up' else 1
        await game_manager.perform_an_action(self.game_id, "paddle", side=self.match_manager.side, direction=direction)


    async def create_and_setup_match(self, content):
        try:
            self.match_manager = await make_match_instance(self.player, self.game_type, game_info=content)
            matched = await self.match_manager.matchmaking()

            if matched:
                if isinstance(self.match_manager, FriendMatch):
                    await self.match_manager.expire()
                p1 = self.match_manager.player['user_id']
                p2 = self.match_manager.opponent['user_id']
                self.player_ = p1
                self.oppoenet_ = p2
                event = await opponent_method(p1=p1, p2=p2, event="game.state")
                self.matched = True
                await self.channel_layer.send(self.match_manager.opponent['channel'], event)
                return await self.send_json(event['data'])
            else:
                self.waiting_task = asyncio.create_task(self.waiting_for_opponent())

        except ValidationError as e:
            error = await error_method(e.message)
            return await self.send_json(error)


    async def get_game_info(self):
        return {
            "tableWidth": settings.TABLE_WIDTH,
            "tableHeight": settings.TABLE_HEIGHT,
            "paddleWidth": settings.PADDLE_WIDTH,
            "paddleHeight": settings.PADDLE_HEIGHT,
            "paddleVelocity": settings.PADDLE_VELOCITY,
            "paddleMargin": settings.PADDLE_MARGIN,
            "ballVelocity": settings.BALL_VELOCITY,
            "ballRadius": settings.BALL_RADIUS
        }





        

