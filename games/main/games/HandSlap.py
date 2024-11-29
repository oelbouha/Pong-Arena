from django.conf import settings

from main.consumers import channel_layer
from main.matches.MatchManager import MatchManager
import time
from enum import Enum

import asyncio

class HandState(Enum):
    NEUTRAL = "neutral"
    ATTACK = "attack"
    RETREAT = "retreat"

class HandAction(Enum):
    ATTACK = "attack"
    RETREAT = "retreat"

class HandSlap:
    def __init__(self, match_manager: MatchManager, **kwargs) -> None:
        self.retreat_timeout = 0.1
        self.default_time_to_sleep = 0.5
        self.match_manager: MatchManager = match_manager

        self.exchange = {
            'p1': 0,
            'p2': 0
        }

        self.hands = {
            'p1':  HandState.NEUTRAL.value,
            'p2': HandState.NEUTRAL.value
        }
        self.timestamp = {
            'p1': None,
            'p2':None
        }

        self.actions = {
            'p1': HandAction.RETREAT.value,
            'p2': HandAction.ATTACK.value
        }

        self.score = {
            'p1': 0,
            'p2': 0
        }


    async def attack(self, player):
        time_to_sleep = self.default_time_to_sleep
        current_time = time.time()
        if player == "p1" and self.actions['p1'] == HandAction.ATTACK.value and self.hands['p1'] == HandState.NEUTRAL.value:
            self.timestamp['p1'] = current_time
            self.hands["p1"] = HandState.ATTACK.value
            self.exchange['p1'] += 1
            await self.send_hands_state()

            if self.hands['p2'] == HandState.NEUTRAL.value:
                self.score['p1'] += 1
                await self.send_score_state()
                if self.score['p1'] >= self.match_manager.winning_score:
                    await self.match_manager.end_of_match(self.score, self.exchange)
                time_to_sleep *= 2
            else:
                await self.switch_actions()
                await self.send_actions_state()
                time_to_sleep *= 3

            asyncio.create_task(self.return_hand_to_neutral('p1', time_to_sleep))
        


        elif player == "p2" and self.actions['p2'] == HandAction.ATTACK.value and self.hands['p2'] == HandState.NEUTRAL.value:
            self.timestamp['p2'] = current_time
            self.hands['p2'] = HandState.ATTACK.value
            self.exchange['p2'] += 1
            await self.send_hands_state()

            if self.hands['p1'] == HandState.NEUTRAL.value:
                self.score['p2'] += 1
                await self.send_score_state()
                if self.score['p2'] >= self.match_manager.winning_score:
                    await self.match_manager.end_of_match(self.score, self.exchange)
                time_to_sleep = 1.2
            else:
                await self.switch_actions()
                await self.send_actions_state()
                time_to_sleep = 1.3

            asyncio.create_task(self.return_hand_to_neutral('p2', time_to_sleep))


    async def retreat(self, player):
        current_time = time.time()
        if player == "p1" and self.actions['p1'] == HandAction.RETREAT.value and self.hands['p1'] == HandState.NEUTRAL.value:
            if self.timestamp['p2'] and current_time -  self.timestamp['p2'] >= self.retreat_timeout and self.hands['p2'] == HandState.ATTACK.value:
                return
            self.hands['p1'] = HandState.RETREAT.value
            # self.timestamp['p1'] = current_time
            self.exchange['p1'] += 1
            await self.send_hands_state()
            asyncio.create_task(self.return_hand_to_neutral('p1', 0.9))



        elif player == "p2" and self.actions['p2'] == HandAction.RETREAT.value and self.hands['p2'] == HandState.NEUTRAL.value:
            if self.timestamp['p1'] and current_time -  self.timestamp['p1'] >= self.retreat_timeout and self.hands['p1'] == HandState.ATTACK.value:
                return
            self.hands['p2'] = HandState.RETREAT.value
            # self.timestamp['p2'] = current_time
            self.exchange['p2'] += 1
            await self.send_hands_state()
            asyncio.create_task(self.return_hand_to_neutral('p2', 0.9))


    async def switch_actions(self):
        self.actions['p1'] = HandAction.ATTACK.value if self.actions['p1'] == HandAction.RETREAT.value else HandAction.RETREAT.value
        self.actions['p2'] = HandAction.ATTACK.value if self.actions['p2'] == HandAction.RETREAT.value else HandAction.RETREAT.value

    
    async def send_hands_state(self):
        event = {
            'type': 'game.state',
            'data': {
                'm': 'g',
                'h': self.hands,
            }
        }

        await channel_layer.send(self.match_manager.player['channel'], event)
        await channel_layer.send(self.match_manager.opponent['channel'], event)


    async def send_actions_state(self):
        event = {
            'type': 'game.state',
            'data': {
                'm': 'g',
                'a': self.actions,
            }
        }

        await channel_layer.send(self.match_manager.player['channel'], event)
        await channel_layer.send(self.match_manager.opponent['channel'], event)


    async def send_score_state(self):
        event = {
            'type': 'game.state',
            'data': {
                'm': 'g',
                's': self.score
            }
        }

        await channel_layer.send(self.match_manager.player['channel'], event)
        await channel_layer.send(self.match_manager.opponent['channel'], event)


    async def return_hand_to_neutral(self, p, time_to_sleep):
        await asyncio.sleep(time_to_sleep)
        self.hands[p] = HandState.NEUTRAL.value

