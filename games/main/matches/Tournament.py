from django.db.models import Q
from django.core.exceptions import ValidationError
from django.db import OperationalError, IntegrityError

from channels.db import database_sync_to_async



from main.matches.MatchManager import MatchManager
from main.models import StatusChoices
from main.models.Match import Match, MatchStatus
from main.consumers import channel_layer
from main.consumers import redis_instance

from shared_models.models import Tournament

from redis.commands.json.path import Path

import json
import sys

class TournamentMatch(MatchManager):

	def __init__(self, player, game_type) -> None:
		self.waiting_status = StatusChoices.WAITING_FOR_ADVERSARY
		self.match: Match = None
		self.tournament: Tournament = None
		super().__init__(player, game_type)


	async def validate_game_info(self, game_info):
		try:
			tourn_id = game_info['tourn']
			await self.set_tournament(tourn_id)
			await self.set_current_match()

		except KeyError:
			raise ValidationError("invalid tournament")
		except Tournament.DoesNotExist:
			raise ValidationError("tournament not found")
		except Match.DoesNotExist:
			raise ValidationError("round not started yet")
		

	async def matchmaking(self):
		await self.change_player_status(StatusChoices.WAITING_FOR_ADVERSARY)
		await self.set_tournament_to_player()
		self.opponent = await self.get_opponent()

		return (self.opponent is not None)
	

	async def matchmaking_timeout(self):
		await self.change_player_status(StatusChoices.CONNECTED)
		p1_score = self.winning_score if self.match.p1.id == self.player['user_id'] else 0
		p2_score = self.winning_score if self.match.p2.id == self.player['user_id'] else 0

		score = {
			'p1': self.winning_score if self.match.p1.id == self.player['user_id'] else 0,
			'p2': self.winning_score if self.match.p2.id == self.player['user_id'] else 0
		}

		self.end_of_match(score, exchange={
			'p1': 0,
			'p2': 0
		})


	async def set_tournament_to_player(self):
		await redis_instance.json().set(f"{self.game_type}:{self.player['user_id']}", Path(".invitation"), None)
		await redis_instance.json().set(f"{self.game_type}:{self.player['user_id']}", Path(".tournament"), self.tournament.id)
		self.player = await redis_instance.json().get(f"{self.game_type}:{self.player['user_id']}")


	@database_sync_to_async
	def set_tournament(self, id):
		self.tournament = Tournament.objects.get(id=id) 
		

	@database_sync_to_async
	def set_current_match(self):
		self.match = Match.objects.select_related('p1', 'p2').get(
			Q(p1_id=self.player['user_id']) | Q(p2_id=self.player['user_id']),
			tournament=self.tournament,
			round=self.tournament.current_round - 1,
			status=MatchStatus.PENDING
		)

		self.winning_score = self.match.winning_score

		self.winning_score = self.match.winning_score


	async def get_opponent(self):
		opponent = self.match.p1
		if self.player['user_id'] == self.match.p1.id:
			opponent = self.match.p2

		# TODO specify the tournament where the player waiting
		search_query = f'@status:{StatusChoices.WAITING_FOR_ADVERSARY} @user_id:[{opponent.id} {opponent.id}] @tournament:{self.tournament.id}'
		result = await redis_instance.ft(f'idx:{self.game_type}').search(search_query)

		if result.docs:
			p = json.loads(result.docs[0].json)
			return p

		return None


	@database_sync_to_async
	def create_match(self, **kwargs):
		try:
			if self.match.p1.id == self.player['user_id']:
				self.match.p1_score = kwargs['score']['p1']
				self.match.p2_score = kwargs['score']['p2']
				self.match.p1_exchange = kwargs['exchange']['p1']
				self.match.p2_exchange = kwargs['exchange']['p2']

			else:
				self.match.p1_score = kwargs['score']['p2']
				self.match.p2_score = kwargs['score']['p1']
				self.match.p1_exchange = kwargs['exchange']['p2']
				self.match.p2_exchange = kwargs['exchange']['p1']

			self.match.status = MatchStatus.FINISHED
			self.match.save()
			return self.match
		except (OperationalError, IntegrityError):
			return None