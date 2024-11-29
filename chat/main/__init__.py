import redis
from django.conf import settings

host, port = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0]

redis_instance = redis.Redis(host=host, port=port, decode_responses=True)


