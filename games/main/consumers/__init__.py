from channels.layers import get_channel_layer

import redis.asyncio as aredis
import redis
from django.conf import settings
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import NumericFilter, Query
from redis.exceptions import ResponseError

channel_layer = get_channel_layer()
game_id = 0


host, port = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0]

redis_instance = aredis.Redis(host=host, port=port, decode_responses=True)
sync_redis_instance = redis.Redis(host=host, port=port, decode_responses=True)

schema = (
    NumericField("$.user_id", as_name="user_id"),
    TextField("$.channel", as_name="channel"),
    NumericField("$.hand", as_name="hand"),
    TextField("$.status", as_name="status"),
    TextField("$.invitation", as_name="invitation"),
    TextField("$.tournament", as_name="tournament"),
)


try:
    sync_redis_instance.ft(index_name="idx:PONG").create_index(schema, definition=IndexDefinition(prefix=["PONG:"], index_type=IndexType.JSON))
    sync_redis_instance.ft(index_name="idx:SLAP").create_index(schema, definition=IndexDefinition(prefix=["SLAP:"], index_type=IndexType.JSON))
except ResponseError:
    pass

sync_redis_instance.close()
