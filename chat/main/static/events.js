const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id')
const msgList = document.getElementById("message-list")
const messageInput = document.getElementById('message-input')
const sendButton = document.getElementById('send-button')
const fileInput = document.getElementById('file-input')
const formData = new FormData();
formData.append('csrfmiddlewaretoken', csrftoken)

let tmp_data
let upload_file = false
let socket = new WebSocket(`ws://localhost:8000/ws/chat/room/`)
let is_typing = false

socket.onopen = () => {
    console.log("socket accepted")
}


socket.onmessage = (e) => {
    const data = JSON.parse(e.data)
    console.log(data)
    if (data.m == 'st')
        handle_sent(data)
    else if (data.m == 'msg')
        handle_message(data)
    else if (data.m == 'recv')
        handle_recieved(data)
    else if (data.m == 'sn')
        handle_seen(data)
    else if (data.m == 'typ')
        handle_typing()
    else if (data.m == 'styp')
        handle_stop_typing()
}


socket.onclose = (e) => {
    console.log(e)
}


messageInput.oninput = () => {
    if (messageInput.value.length == 0) {
        const typ = {
            m: 'styp',
            clt: id
        }
        socket.send(JSON.stringify(typ))
        is_typing = !is_typing
    }
    else if (!is_typing) {
        const typ = {
            m: 'typ',
            clt: id
        }
        socket.send(JSON.stringify(typ))
        is_typing = !is_typing
    }
}


sendButton.onclick = () => {

    if (upload_file)
        send_file(id, messageInput.value)
    else {
        is_typing = !is_typing
        const data = {
            m: 'msg',
            clt: id,
            tp: 'txt',
            cnt: messageInput.value,
        }
        socket.send(JSON.stringify(data))
    }
}


fileInput.addEventListener('change', function () {
    const fileName = this.files[0] ? this.files[0].name : '';
    document.getElementById('attachment-button').textContent = fileName;
    upload_file = true
});


function handle_sent(data) {
    if (data.tp == 'txt')
    {
        console.log("the type is text")
        msgList.innerHTML += `<li class="message sender" id="${data.msg}"><span>sent</span>${messageInput.value}</li>`
    }
    else if (data.tp == 'atta')
    {

        msgList.innerHTML += `
            <div class="attachment-message">
                    <div class="attachment-name">${fileInput.files[0].name}</div>
                    <div class="attachment-caption">${tmp_data.cap}</div>
            </div>
        `
    }
    messageInput.value = ""
}


function handle_recieved(data) {
    const msgSpan = document.getElementById(`${data.msg}`).children[0]
    msgSpan.innerHTML = 'recv'
}


function handle_message(data) {
    messageInput.placeholder = "Type your message..."
    msgList.innerHTML += `<li class="message" id="${data.msg}">${data.cnt}</li>`
    const recv = {
        m: 'recv',
        clt: id,
        msg: data.msg
    }
    const seen = {
        m: 'sn',
        clt: id,
        msg: data.msg
    }
    setTimeout(() => socket.send(JSON.stringify(recv)), 1000)
    setTimeout(() => socket.send(JSON.stringify(seen)), 2000)

}


function handle_seen(data) {
    const msgSpan = document.getElementById(`${data.msg}`).children[0]
    msgSpan.innerHTML = 'seen'
}


function handle_typing() {
    messageInput.placeholder = "typing..."
}


function handle_stop_typing() {
    messageInput.placeholder = "Type your message..."
}


function send_file() {
    const file = fileInput.files[0]
    formData.append('file', file);


    fetch('http://localhost:8000/upload/', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('File upload failed');
            }
        })
        .then(data => {
            is_typing = !is_typing
            tmp_data = {
                m: 'msg',
                clt: id,
                tp: 'img',
                cnt: JSON.stringify(data),
            }
            socket.send(JSON.stringify(tmp_data))
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });

}
