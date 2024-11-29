from django.conf import settings

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from main.consumers import redis_instance
from main.models import  StatusChoices
from main.games import game_manager
from main.matches.MatchManager import MatchManager
from main.matches.Friend import FriendMatch

from redis.commands.json.path import Path
import asyncio
import sys

class Game(AsyncJsonWebsocketConsumer):
    
    def __init__(self, *args, **kwargs):
        self.game_type = None
        self.player = None
        self.game_id = None
        self.waiting_task = None
        self.match_manager: MatchManager = None
        self.matched = False
        super().__init__(*args, **kwargs)
    
    
    async def connect(self):
        if self.scope['user'].is_authenticated:
            player_exists = await self.player_already_exists()
            if player_exists:
                return await self.close()
            self.player = await self.create_player()
            return await self.accept()
        return await self.close()


    async def cleanup(self):
        if self.match_manager:
            if isinstance(self.match_manager, FriendMatch):
                await self.match_manager.expire()
            await self.match_manager.clean()
        if (self.game_id is not None) or self.matched:
            await self.match_manager.walkover()

        await self.delete_player()


    async def disconnect(self, code):
        await self.cleanup()
        return await super().disconnect(code)
    

    async def waiting_for_opponent(self):
        try:
            for i in range(settings.MATCHMAKING_TIMEOUT):
                await asyncio.sleep(1)

            await self.match_manager.matchmaking_timeout()
            await self.cleanup()
            self.match_manager = None
            self.waiting_task = None
            await self.close()
        except asyncio.CancelledError:
            pass



    async def game_state(self, event):
        data = event['data']
        if data['m'] == 'opp':
            self.matched = True
            if self.waiting_task:
                self.waiting_task.cancel()
            await self.handle_opponent_method(data)

        elif data['m'] == 'st':
            await self.handle_start_method(data)
        else:
            if data['m'] == "end":
                await self.send_json(data)
                await game_manager.remove_game(self.game_id)
                self.matched = False
                self.game_id = None
                self.match_manager = None
            await self.send_json(data)


    async def handle_opponent_method(self, data):
        opp_id = data['p1'] if self.player['user_id'] != data['p1'] else data['p2']
        content = await self.verify_opponent_existance(opp_id)
        if (content['m'] == 'err'):
            await self.send_json(content=content)
        else:
            self.player_ = data['p1']
            self.oppoenet_ = data['p2']
            await self.send_json(content=data)


    async def get_game_info(self):
        return {
            "table_width": settings.TABLE_WIDTH,
            "table_height": settings.TABLE_HEIGHT,
            "paddle_width": settings.PADDLE_WIDTH,
            "paddle_height": settings.PADDLE_HEIGHT,
            "paddle_velocity": settings.PADDLE_VELOCITY,
            "paddle_margin": settings.PADDLE_MARGIN,
            "ball_velocity": settings.BALL_VELOCITY,
            "ball_radius": settings.BALL_RADIUS
        }
    

    async def player_already_exists(self, **kwargs):
        player: dict = await redis_instance.json().get(f"{self.game_type}:{self.scope['user'].id}")
        return player is not None


    async def create_player(self):
        player_data = {
            'user_id': self.scope['user'].id,
            'channel': self.channel_name,
            'hand': 1,
            'status': StatusChoices.CONNECTED,
            'invitation': None,
            'tournament': None
        }

        await redis_instance.json().set(f"{self.game_type}:{self.scope['user'].id}", Path.root_path(), player_data)
        return player_data

    
    async def delete_player(self):
        await redis_instance.json().delete(f"{self.game_type}:{self.scope['user'].id}")


    async def verify_opponent_existance(self, id):
        self.match_manager.opponent = await redis_instance.json().get(f"{self.game_type}:{id}")
        content = {
            "m": "opp",
            "id": self.match_manager.opponent['user_id']
        }
        if self.match_manager.opponent is None:
            content = {
                "m": "err",
                "err": "player disconnect"
            }
        
        return content


    async def opponent_refresh(self):
        opp_uid = self.match_manager.opponent['user_id']
        updated_opp = await redis_instance.json().get(f"{self.game_type}:{opp_uid}")
        self.match_manager.opponent = updated_opp
