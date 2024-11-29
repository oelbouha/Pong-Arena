import json
import redis

from shared_models.models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.conf import settings
host, port = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0]
redis_instance = redis.Redis(host=host, port=port, decode_responses=True)

channel_layer = get_channel_layer()

def notify(target, save=True, **kwargs):
    if save:
        Notification.objects.create(target_id=target, content=json.dumps(kwargs))
    data = {
        'm': 'notif',
        **kwargs,
    }
    target_channels = redis_instance.smembers(f'chat:{target}')
    for channel in target_channels:
        async_to_sync(channel_layer.send)(channel,{
            "type": "chat.message",
            "data": data
        })




