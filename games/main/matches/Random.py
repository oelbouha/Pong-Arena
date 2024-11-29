from main.matches.MatchManager import MatchManager
from main.models import StatusChoices
from main.consumers import redis_instance

import json

class RandomMatch(MatchManager):

	def __init__(self, player, game_type) -> None:
		self.waiting_status = StatusChoices.WAITING_FOR_SOMEONE
		super().__init__(player, game_type)


	async def matchmaking(self):
		await self.change_player_status(StatusChoices.WAITING_FOR_SOMEONE)
		
		queue_len = await redis_instance.llen(f"queue:{self.game_type}")
		if queue_len == 0:
			await redis_instance.lpush(f"queue:{self.game_type}", json.dumps(self.player))
			return False
		
		opponent = await redis_instance.lpop(f"queue:{self.game_type}")
		self.opponent = json.loads(opponent)
		return True


	async def matchmaking_timeout(self):
		await self.clean()
		return await super().matchmaking_timeout()


	async def clean(self):
		await redis_instance.lrem(f"queue:{self.game_type}", 0, json.dumps(self.player))
		return await super().clean()
	

