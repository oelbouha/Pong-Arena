import json

from main.models import Notification


from channels.layers import get_channel_layer

from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

def send_notification(target, target_channels, **kwargs):
    notification = Notification.objects.create(target=target, content=json.dumps(kwargs))

    data = {
        'm': 'notif',
        **kwargs,
    }
    for channel in target_channels:
        async_to_sync(channel_layer.send)(channel,{
            "type": "chat.message",
            "data": data
        })




