Chat Protocol
=============

Notice:
-------
We use custom message codes instead of full text messages to minimize the amount of data sent over the WebSocket connection.

*   `sent` -> `st`
*   `recieve` -> `recv`
*   `seen` -> `sn`
*   `typing` -> `typ`
*   `stop typing` -> `styp`
*   `recording` -> `rcd`
*   `stop recording` -> `srcd`
*   `attachment` -> `atta`
*   `message` -> `msg`
*   `error` -> `err`
*   `type` -> `tp`
*   `client` -> `clt`
*   `voice` -> `vc`
*   `video` -> `vd`
*   `image` -> `img`
*   `identifier` -> `id`
*   `content` -> `cnt`

Methods:
--------

*   `sent (st):` The sent method is a reply sent by the server to the client, indicating that the message has been delivered successfully to the server.
*   `recieve (recv):` The received method, sent by the destination (recipient) to the sender, confirms that the message has been successfully received on the recipient's side.
*   `seen (sn):` The seen method is a reply sent by the destination to the sender, signifies that the recipient has successfully viewed the message.
*   `typing (typ):` The typing method, sent by the sender to the recipient, indicates that the sender has begun composing a new message.
*   `recording (rcd):` The recording method, sent by the sender to the recipient, indicates that the sender has begun recording audio.
*   `stop typing (styp):` The stop typing method, sent by the sender to the recipient, indicates that the user has stopped typing a new message.
*   `stop recording (srcd):` The stop recording method, sent by the sender to the recipient, indicates that the user has stopped recording audio.
*   `message (msg):` The message method initiates the transmission of a new message from the sender to the recipient.
*   `error (err):` The error method, a server-side message to the client, indicates that an error occurred during message processing or transmission.

### Sent:
```json
    {
        "m": "st",
        "clt": "user_id",
        "msg": "msg_id" 
    }
        
```
* `clt:` the ID of the message recipient
* `msg:` the message ID

### Receive | Seen:
```json
    {
        "m": "method",
        "clt": "user_id",
        "msg": "msg_id"
    }
```        

* `clt:` refers to the user ID. However, when a client sends this message, the `clt` property might contain the recipient's ID. The server then replaces it with the sender's ID before forwarding the message. This approach informs the recipient who sent the message.
* `msg:` the message ID

### Typing | Stop Typing | Recording | Stop Recording:
```json
    {
        "m": "method",
        "clt": "client id"
    }
```

* `clt:` refers to the user ID. However, when a client sends this message, the `clt` property might contain the recipient's ID. The server then replaces it with the sender's ID before forwarding the message. This approach informs the recipient who sent the message.

### Message:
```json
    {
        "m": "msg",
        "clt": "user_id",
        "tp": "message_type",  // txt, vc, att, image, video
        "cnt": "message_content",
        "msg": "msg_id"  // exists only if a server sends a msg method to client
    }
```      

* `clt:` refers to the user ID. However, when a client sends this message, the `clt` property might contain the recipient's ID. The server then replaces it with the sender's ID before forwarding the message. This approach informs the recipient who sent the message.
* `tp:` defines message types to enable differentiated behavior based on the message content. For example, upon receiving a voice message, a request to the server to retrieve the audio file is initiated. Once retrieved, the UI is updated to reflect an audio message format.
* `cnt:` This property holds the content of the message. If the message is a file such as audio, video, image, or attachment, the `cnt` property contains a JSON object with the following fields:
    *   `prv_f:` The path to the preview file if the content is an image or video.
    *   `f:` The path to the actual file.
    *   `cap (if it exists):` The caption associated with the file.
* `msg:` This property represents the message ID generated when a message record is created on the server. It exists only when the server forwards the `msg` method to the recipient, allowing it to be used as an ID for the element containing the message.

### Error:
```json
    {
        "m": "err",
        "err": "error message"
    }
```

Files Message Handling:
-----------------------

* When a user wants to send a file message, the entire file should not be sent through a WebSocket. Instead, if the file is a video or image, a preview file is created first. Subsequently, both the preview and the actual file are sent using a POST method. The server then awaits a response containing the paths of the sent files. Upon receiving this response, the paths are sent through the WebSocket.
* On the recipient side, the path is received via WebSocket. Upon receiving it, a GET request is made to retrieve the file (preview file). If a preview file exists, it is displayed, otherwise, the message type reflection is displayed. If a preview file is present and clicked, a GET request with the file path is sent to display the entire file content.