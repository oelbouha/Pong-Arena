from django.db import OperationalError, IntegrityError
from channels.db import database_sync_to_async

from main.consumers import redis_instance
from main.models import  StatusChoices
from main.models.Match import Match, MatchStatus
from main.consumers import channel_layer
from django.conf import settings

from redis.commands.json.path import Path


class MatchManager:

	def __init__(self, player, game_type) -> None:
		self.game_type = game_type
		self.player = player
		self.opponent = None
		self.side = None
		self.winning_score = settings.DEFAULT_WINNING_SCORE


	async def clean(self):
		pass


	async def matchmaking_timeout(self):
		await self.change_player_status(StatusChoices.CONNECTED)
		await channel_layer.send(self.player['channel'], {
			'type': 'game.state',
			'data': {
				'm': 'to'
			}
		})


	async def change_player_status(self, status):
		await redis_instance.json().set(f"{self.game_type}:{self.player['user_id']}", Path(".status"), status)
		self.player = await redis_instance.json().get(f"{self.game_type}:{self.player['user_id']}")


	async def set_player_hand(self, hand):
		if hand != 1:
			await redis_instance.json().set(f"{self.game_type}:{self.player['user_id']}", Path(".hand"), hand)
			self.player = await redis_instance.json().get(f"{self.game_type}:{self.player['user_id']}")


	async def end_of_match(self, score, exchange):
		match = await self.create_match(
			score=score, 
			exchange=exchange, 
			type=self.game_type
		)
		if match is None:
			event = {
				'type': 'game.state',
				'data': {
					'm': 'err',
					'err': 'server error while saving match'
				}
			}
			await channel_layer.send(self.player['channel'], event)
			await channel_layer.send(self.opponent['channel'], event)
			return

		event = {
			'type': 'game.state',
		}
		if score['p1'] > score['p2']:
			event['data'] = {
				'm': 'end',
				'p1': 'win',
				'p2': 'lose'
			}
			await channel_layer.send(self.player['channel'], event)
			await channel_layer.send(self.opponent['channel'], event)
		else:
			event['data'] = {
				'm': 'end',
				'p1': 'lose',
				'p2': 'win'
			}
			await channel_layer.send(self.opponent['channel'], event)
			await channel_layer.send(self.player['channel'], event)


	async def walkover(self):
		score = {}
		score['p1'] = 0
		score['p2'] = self.winning_score 
		score = {
			'p1': 0,
			'p2': self.winning_score 
		}

		event = {
			'type': 'game.state',
			'data': {
				'm': 'g',
				's':score
			}
		}

		await channel_layer.send(self.opponent['channel'], event)
		await self.end_of_match(score, exchange={
			'p1': 0,
			'p2': 0
		})
		

	@database_sync_to_async
	def create_match(self, **kwargs):
		try:
			m = Match.objects.create(
				p1_id=self.player['user_id'],
				p2_id=self.opponent['user_id'],
				p1_score=kwargs['score']['p1'],
				p2_score=kwargs['score']['p2'],
				p1_exchange=kwargs['exchange']['p1'],
				p2_exchange=kwargs['exchange']['p2'],
				type=kwargs['type'],
				status=MatchStatus.FINISHED
			)
			return m
		except (OperationalError, IntegrityError):
			return None
