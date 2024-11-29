import json
import secrets

from django.db.models import Q
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.conf import settings

from channels.generic.websocket import JsonWebsocketConsumer
from asgiref.sync import async_to_sync

from main.models import Message, Conversation, StatusChoices, TypeChoices, Invitation, Friendship, Notification, InvitationStatusChoices
from main.utils import send_notification




from main import redis_instance

User = get_user_model()

import sys

class Chat(JsonWebsocketConsumer):

    def __init__(self, *args, **kwargs):
        self.STATUS = {}
        self.ACTION = {}
        self.MESSAGE = {}
        self.INVITATION = {}
        
        super().__init__(*args, **kwargs)


    def connect(self):
        if self.scope['user'].is_authenticated:
            redis_instance.sadd(f"chat:{self.scope['user'].id}", self.channel_name)
            self.accept()
            self.send_online_status_to_friends("online")
            
        else:
            self.close()


    def disconnect(self, code):
        if self.scope['user'].is_authenticated:
            redis_instance.srem(f"chat:{self.scope['user'].id}", self.channel_name)
            if redis_instance.scard(f"chat:{self.scope['user'].id}") == 0:
                self.send_online_status_to_friends("offline")
        return super().disconnect(code)


    def receive_json(self, content, **kwargs):
        try:
            self.parser(content)
            if content['m'] in ['recv', 'sn']:
                self.handle_message_status_methods(content['m'])
            elif content['m'] in ['typ', 'styp', 'rcd', 'srcd']:
                self.handle_user_actions_methods(content['m'])
            else:
                self.handle_messages_method()
        except ValidationError as e:
            if content['m'] in ['typ', 'styp']:
                return
            data = {
                'm': 'err',
                'err': e.message,
                'clt': content['clt']
            }
            if 'identifier' in content:
                data['identifier'] = content['identifier']
            self.send_json(data)


    def chat_message(self, event):
        self.send_json(content=event['data'])


    def parser(self, json_data):
        user = self.scope['user']
        try:
            if (not 'm' in json_data):
                raise ValidationError('method key not found')

            if not json_data['m'] in ['sn', 'recv', 'typ', 'rcd', 'styp', 'srcd', 'msg']:
                raise ValidationError('invalid method')

            clt = json_data['clt']
            clt_id = int(clt)
            client = User.objects.get(id=clt_id)


            if not client.can_send_to(user.id) or not user.can_send_to(client.id):
                raise ValidationError("you can't message this person")
        
            if json_data['m'] in ['sn', 'recv']:
                self.parse_status_methods(json_data, client)
            elif json_data['m'] in ['typ', 'rcd', 'styp', 'srcd']:
                self.ACTION['client'] = client
            else:
                self.parse_message_method(json_data, client)

        except KeyError:
            raise ValidationError('client key not found')

        except ValueError:
            raise ValidationError('client must be a number')
        
        except User.DoesNotExist:
            raise ValidationError('client not found')


    def parse_status_methods(self, json_data, client):
        try:
            msg = json_data['msg']
            msg_id = int(msg)
            message = Message.objects.get(id=msg_id)
            self.STATUS['client'] = client
            self.STATUS['message'] = message

        except KeyError:
            raise ValidationError('message key not found')

        except ValueError:
            raise ValidationError('message must be a number')
    
        except Message.DoesNotExist:
            raise ValidationError('message with the given id not found')
        

    def parse_message_method(self, json_data, client):
        try:
            type = json_data['tp']
            if type == TypeChoices.INVITATION:
                self.MESSAGE['game'] = json_data['game']
    
            content = json_data['cnt']
            
            id = json_data['identifier']
            try:
                conversation = Conversation.objects.get(
                    Q(user1=client) | Q(user1=self.scope['user']),
                    Q(user2=self.scope['user']) | Q(user2=client),
                )
            except Conversation.DoesNotExist:
                conversation = Conversation(user1=client, user2=self.scope['user'])
                conversation.save()

            if not type in TypeChoices:
                raise ValidationError("invalid message type")

            if (type not in [TypeChoices.TEXT, TypeChoices.INVITATION]) and (not 'f' in content): # TODO handle file preview parsing
                raise ValidationError("missing file in attachment message")
            

            # TODO handle invitation existance in db in Inv message type

            self.MESSAGE['client'] = client
            self.MESSAGE['id'] = id
            self.MESSAGE['conversation'] = conversation
            self.MESSAGE['type'] = type
            self.MESSAGE['content'] = content

        except KeyError:
            raise ValidationError("type | content | identifier key not found")

        


    def handle_message_status_methods(self, method):
        self.STATUS['message'].status = StatusChoices.RECEIVED if method == 'recv' else StatusChoices.SEEN
        self.STATUS['message'].save()

        data = {
            'm': method,
            'clt': self.scope['user'].id,
            'msg': self.STATUS['message'].id,
        }
        self.send_to_client(self.STATUS['client'], data)


    def handle_user_actions_methods(self, method):
        data = {
            'm': method,
            'clt': self.scope['user'].id,
        }
        self.send_to_client(self.ACTION['client'], data)


    def create_invitation(self):
        has_pending_invitation = redis_instance.get(f'user:invitation:{self.scope['user'].id}')
        if has_pending_invitation is not None:
            raise ValidationError("pending invitation")
        exists = redis_instance.scard(f'chat:{self.MESSAGE['client'].id}')
        if not exists:
            raise ValidationError("user is offline")

        token = secrets.token_hex(24)

        self.MESSAGE['content'] = json.dumps({
            'invitation': token,
            'status': InvitationStatusChoices.PENDING ,
            'game': self.MESSAGE['game']
        })
        if exists:
            redis_instance.set(f'invitation:{token}', f"{self.scope['user'].id}_{self.MESSAGE['client'].id}", ex=settings.INVITATION_EXPIRATION_TIME)
            redis_instance.set(f'user:invitation:{self.scope['user'].id}', token, ex=settings.INVITATION_EXPIRATION_TIME)
            redis_instance.set(f'user:invitation:{self.MESSAGE['client'].id}', token, ex=settings.INVITATION_EXPIRATION_TIME)
            

    def handle_messages_method(self):
        if self.MESSAGE['type'] == TypeChoices.INVITATION:
            self.create_invitation()
        try:
            resp, forword = {}, {}
            if self.MESSAGE['type'] != TypeChoices.INVITATION:
                message = Message.objects.create(
                    sender=self.scope['user'],
                    recipient=self.MESSAGE['client'],
                    conversation=self.MESSAGE['conversation'],
                    type=self.MESSAGE['type'],
                    content=self.MESSAGE['content'],
                )
                resp = {
                    'm': 'st',
                    'clt': self.MESSAGE['client'].id,
                    'msg': message.id,
                    'identifier': self.MESSAGE['id']
                }
                forword = {
                    'm': 'msg',
                    'clt': self.scope['user'].id,
                    'tp': self.MESSAGE['type'],
                    'cnt': self.MESSAGE['content'],
                    'msg': message.id,
                }
            else:
                resp = {
                    'm': 'inv_resp',
                    'clt': self.MESSAGE['client'].id,
                    'identifier': self.MESSAGE['id'],
                    'cnt': self.MESSAGE['content'],
                }
                forword = {
                    'm': 'msg',
                    'clt': self.scope['user'].id,
                    'tp': self.MESSAGE['type'],
                    'cnt': self.MESSAGE['content']
                }

            self.send_json(resp)
            self.send_to_client(self.MESSAGE['client'], forword)
        except Exception as e:
            raise ValidationError("error while creating message, please try later")


    def send_to_client(self, client, data):
        channels = redis_instance.smembers(f"chat:{client.id}")

        for channel in channels:
            async_to_sync(self.channel_layer.send)(channel,{
                "type": "chat.message",
                "data": data
            })


    def send_online_status_to_friends(self, status):
        friends = Friendship.objects.filter(
            Q(user1=self.scope['user']) | Q(user2=self.scope['user'])
        )

        friends_channels = [
            redis_instance.smembers(f"chat:{self.get_friend_user_id(friend)}")
            for friend in friends
        ]


        for channels in friends_channels:
            for channel in channels:
                async_to_sync(self.channel_layer.send)(channel, {
                    "type": "chat.message",
                    "data": {
                        "m": status,
                        "clt": self.scope['user'].id
                    }
                })


    def get_friend_user_id(self, friend: Friendship):
        return friend.user1.id if friend.user1.id != self.scope['user'].id else friend.user2.id



# TODO change message status with choices

# TODO impliment notification system
