from django.core.exceptions import ValidationError
from main.matches.Random import RandomMatch
from main.matches.Friend import FriendMatch
from main.matches.Tournament import TournamentMatch


async def make_match_instance(player, game_type, game_info=None):
	if not 'type' in game_info:
		raise ValidationError("invalid game type")
	
	if not game_info['type'] in ['random', 'friend', 'tournament']:
		raise ValidationError("invalid game type")
	
	if game_info['type'] == "random":
		instance = RandomMatch(player, game_type)
	elif game_info['type'] == "friend":
		instance = FriendMatch(player, game_type)
		await instance.validate_game_info(game_info)
	else:
		instance = TournamentMatch(player, game_type)
		await instance.validate_game_info(game_info)

	return instance


async def start_method(event=None, game_id=None):
	if event is None:
		return {
			'm': 'st'
		}

	data = {
		'type': event,
		'data': {
			'm': 'st',
		}
	}
	if game_id is not None:
		data['data']['game_id'] = game_id

	return data


async def opponent_method(p1, p2, event=None):
	data = {
		'm': 'opp',
		'p1': p1,
		'p2': p2
	}

	if event is None:
		return data
	else:
		return {
			'type': event,
			'data': data
		}


async def error_method(error_message, event=None):
	data = {
		'm': 'err',
		'err': error_message
	}

	if event is None:
		return data
	
	return {
		'type': event,
		'data': data
	}