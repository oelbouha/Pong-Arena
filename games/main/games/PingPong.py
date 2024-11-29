from django.conf import settings

from main.consumers import channel_layer
from main.matches.MatchManager import MatchManager

import asyncio
from asyncio.tasks import Task
import time
import numpy


class PingPong:

    next_id = 0
    def __init__(self, match_manager, **kwargs) -> None:

        self.id = PingPong.next_id
        PingPong.next_id += 1
        self.send_game_state_task: Task = None
        self.match_manager: MatchManager = match_manager
        self.paddle_dy = settings.PADDLE_DY

        self.timestamp = time.time()


        self.exchange = {
            'p1': 0,
            'p2': 0,
        }

        self.ball = {
            'x': settings.TABLE_WIDTH / 2,
            'y': settings.TABLE_HEIGHT / 2,
            'vx': settings.BALL_VELOCITY,
            'vy': settings.BALL_VELOCITY
        }

        self.paddles = {
            'p1': {
                'x': settings.PADDLE_MARGIN,
                'y': (settings.TABLE_HEIGHT - settings.PADDLE_HEIGHT) / 2,
            },
            'p2': {
                'x': settings.TABLE_WIDTH - settings.PADDLE_WIDTH - settings.PADDLE_MARGIN,
                'y': (settings.TABLE_HEIGHT - settings.PADDLE_HEIGHT) / 2,
            },
        }

        self.old_ball = {
            'x': settings.TABLE_WIDTH / 2,
            'y': settings.TABLE_HEIGHT / 2,
        }

        self.score = {
            'p1': 0,
            'p2': 0
        }


    async def send_game_state(self):
        try:
            for i in [3, 2, 1, 0]:
                await asyncio.sleep(1)
                event = {
                    'type': 'game.state',
                    'data': {
                        'm': 'count',
                        'count': i,
                    }
                }
                await channel_layer.send(self.match_manager.player['channel'], event)
                await channel_layer.send(self.match_manager.opponent['channel'], event)

            self.timestamp = time.time()

            while True:
                await asyncio.sleep(1 / 5)
                await self.update_ball() 
                event = {
                    'type': 'game.state',
                    'data': {
                        'm': 'g',
                        'b': self.ball,
                    }
                }
                await channel_layer.send(self.match_manager.player['channel'], event)
                await channel_layer.send(self.match_manager.opponent['channel'], event)
        except asyncio.CancelledError:
            await self.reset_game_state()
            await self.match_manager.end_of_match(self.score, self.exchange)


    async def update_paddles(self, player, paddle_direction):
        next_pos = self.paddles[player]['y'] + (self.paddle_dy * paddle_direction) 
        if next_pos < 0:
            self.paddles[player]['y'] = 0
        elif next_pos + settings.PADDLE_HEIGHT > settings.TABLE_HEIGHT:
            self.paddles[player]['y'] = settings.TABLE_HEIGHT - settings.PADDLE_HEIGHT
        else:
            self.paddles[player]['y'] = next_pos

        event = {
            'type': 'game.state',
            'data': {
                'm': 'g',
                'p': self.paddles,
            }
        }
        await channel_layer.send(self.match_manager.player['channel'], event)
        await channel_layer.send(self.match_manager.opponent['channel'], event)


    async def update_ball(self):
        current_timestamp = time.time()
        dx = self.ball['vx']  * (current_timestamp - self.timestamp)
        dy = self.ball['vy']  * (current_timestamp - self.timestamp)

        self.old_ball['x'] = self.ball['x']
        self.old_ball['y'] = self.ball['y']
        self.ball['x'] += dx
        self.ball['y'] += dy

        

        self.timestamp = current_timestamp
        await self.check_walls()
        if self.ball['vx'] < 0:
            await self.check_paddle_collision('p1')
        else:
            await self.check_paddle_collision('p2')


    async def check_walls(self):
        if self.ball['y'] + settings.BALL_RADIUS > settings.TABLE_HEIGHT:
            self.ball['vy'] = -self.ball['vy']
            self.ball['y'] = (settings.TABLE_HEIGHT - settings.BALL_RADIUS) - abs(self.ball['y'] - settings.TABLE_HEIGHT)
            await self.compose_and_send_state()
    
        elif self.ball['y'] - settings.BALL_RADIUS < 0:
            self.ball['vy'] = -self.ball['vy']
            self.ball['y'] = abs(self.ball['y']) + settings.BALL_RADIUS
            await self.compose_and_send_state()

     
    async def check_paddle_collision(self, player):
        old_ball = {
            'x': self.old_ball['x'] + settings.BALL_RADIUS if player == "p2" else self.old_ball['x'] - settings.BALL_RADIUS,
            'y': self.old_ball['y'] + settings.BALL_RADIUS if self.ball['vy'] > 0 else self.old_ball['y'] - settings.BALL_RADIUS
        }

        new_ball = {
            'x': self.ball['x'] + settings.BALL_RADIUS if player == "p2" else self.ball['x'] - settings.BALL_RADIUS,
            'y': self.ball['y'] + settings.BALL_RADIUS if self.ball['vy'] > 0 else self.ball['y'] - settings.BALL_RADIUS
        }

        paddle_start = {
            'x': self.paddles[player]['x'] if player == "p2" else self.paddles[player]['x'] + settings.PADDLE_WIDTH,
            'y': self.paddles[player]['y']
        }

        paddle_end = {
            'x': paddle_start['x'],
            'y': self.paddles[player]['y'] + settings.PADDLE_HEIGHT
        }

        t, u = await self.get_t_and_u(old_ball, new_ball, paddle_start, paddle_end)

        if t >= 0 and t <= 1 and u >= 0 and u <= 1:
            self.ball['vx'] = -self.ball['vx']
            self.exchange[player] += 1
            if player == 'p2':
                self.ball['x'] = (self.paddles[player]['x'] - settings.BALL_RADIUS) - abs(self.ball['x'] - self.paddles[player]['x'])
            else:
                if self.ball['x'] - settings.BALL_RADIUS < 0:
                    self.ball['x'] = (2 * self.paddles[player]['x']) + (2 * settings.PADDLE_WIDTH) + settings.BALL_RADIUS + abs(self.ball['x'] - settings.BALL_RADIUS)
                else:
                    self.ball['x'] = (2 * self.paddles[player]['x']) + (2 * settings.PADDLE_WIDTH) - (self.ball['x'] - settings.BALL_RADIUS) + settings.BALL_RADIUS
        else:
            paddle_start['y'] = 0
            paddle_end['y'] = settings.TABLE_HEIGHT
            t, u = await self.get_t_and_u(old_ball, new_ball, paddle_start, paddle_end)
            if t >= 0 and t <= 1 and u >= 0 and u <= 1:
                opp = 'p1' if player == 'p2' else 'p2'
                self.score[opp] += 1
                if self.score[opp] == self.match_manager.winning_score:
                    self.send_game_state_task.cancel()

                await self.reset_game_state()


    async def get_t_and_u(self, old_ball, new_ball, paddle_start, paddle_end):
        t_matrix = numpy.array([
            [old_ball['x'] - paddle_end['x'], paddle_end['x'] - paddle_start['x']], 
            [old_ball['y'] - paddle_end['y'], paddle_end['y'] - paddle_start['y']]
        ])

        u_matrix = numpy.array([
            [old_ball['x'] - new_ball['x'], old_ball['x'] - paddle_end['x']], 
            [old_ball['y'] - new_ball['y'], old_ball['y'] - paddle_end['y']]
        ])

        common_matrix = numpy.array([
            [old_ball['x'] - new_ball['x'], paddle_end['x'] - paddle_start['x']], 
            [old_ball['y'] - new_ball['y'], paddle_end['y'] - paddle_start['y']]
        ])


        t_det =  numpy.linalg.det(t_matrix)
        u_det = numpy.linalg.det(u_matrix)
        common_det = numpy.linalg.det(common_matrix)


        t = t_det / common_det
        u = (u_det / common_det) * -1

        return t, u



    async def compose_and_send_state(self):
        event = {
            'type': 'game.state',
            'data': {
                'm': 'g',
                'b': self.ball,
            }
        }
        await channel_layer.send(self.match_manager.player['channel'], event)
        await channel_layer.send(self.match_manager.opponent['channel'], event)


    async def reset_game_state(self):
        self.ball = {
            'x': settings.TABLE_WIDTH / 2,
            'y': settings.TABLE_HEIGHT / 2,
            'vx': settings.BALL_VELOCITY,
            'vy': settings.BALL_VELOCITY,
        }

        event = {
            'type': 'game.state',
            'data': {
                'm': 'g',
                'b': self.ball,
                's': self.score
            }
        }
        await channel_layer.send(self.match_manager.player['channel'], event)
        await channel_layer.send(self.match_manager.opponent['channel'], event)
