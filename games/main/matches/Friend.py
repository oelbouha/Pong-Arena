from django.core.exceptions import ValidationError
from django.db.models import Q
from django.conf import settings

from channels.db import database_sync_to_async

from main.matches.MatchManager import MatchManager
from main.models import StatusChoices
from main.models.Invitation import Invitation, InvitationStatusChoices
from main.consumers import channel_layer
from main.consumers import redis_instance

from redis.commands.json.path import Path
from redis.commands.search.query import Query
from datetime import datetime, timezone

import json

class FriendMatch(MatchManager):

	def __init__(self, player, game_type) -> None:
		self.waiting_status = StatusChoices.WAITING_FOR_A_FRIEND
		self.invitation = None
		super().__init__(player, game_type)


	async def validate_game_info(self, game_info):
		try:
			inv_id = game_info['inv']
			await self.check_and_set_invitation(inv_id)
		except KeyError:
			raise ValidationError("invalid invitation")



	async def matchmaking(self):
		await self.change_player_status(StatusChoices.WAITING_FOR_A_FRIEND)
		await self.set_invitation_to_player()
		self.opponent = await self.get_opponent()
		return (self.opponent is not None)


	async def get_opponent(self):
		opponent = self.invitation['p1']
		if self.invitation['p1'] == self.player['user_id']:
			opponent = self.invitation['p2']

	
		search_query = f'@status:{StatusChoices.WAITING_FOR_A_FRIEND} @user_id:[{opponent} {opponent}] @invitation:{self.invitation['token']}'
		result = await redis_instance.ft(f'idx:{self.game_type}').search(search_query)
		
		if result.docs:
			p = json.loads(result.docs[0].json)
			return p
		return None



	async def set_invitation_to_player(self):
		await redis_instance.json().set(f"{self.game_type}:{self.player['user_id']}", Path(".invitation"), self.invitation['token'])
		await redis_instance.json().set(f"{self.game_type}:{self.player['user_id']}", Path(".tournament"), None)
		self.player = await redis_instance.json().get(f"{self.game_type}:{self.player['user_id']}")

	
	
	async def create_match(self, **kwargs):
		try:
			await redis_instance.delete(f"invitation:{self.invitation['token']}")
			return await super().create_match(**kwargs)
		except Exception as e:
			return None
		


	async def check_and_set_invitation(self, token):
		invite_mem = await redis_instance.get(f'invitation:{token}')

		if invite_mem is None:
			raise ValidationError("invitation not found or expired")
		
		members = invite_mem.split('_')

		if not str(self.player['user_id']) in members:
			raise ValidationError("invalid invitation")
		
		self.invitation = {
			'token': token,
			'p1': int(members[0]),
			'p2': int(members[1])
		}


	async def expire(self):
		invite_mem = await redis_instance.get(f'invitation:{self.invitation['token']}')
		if invite_mem is not None:
			members = invite_mem.split('_')
			await redis_instance.delete(f'invitation:{self.invitation['token']}')
			await redis_instance.delete(f'user:invitation:{members[0]}')
			await redis_instance.delete(f'user:invitation:{members[1]}')