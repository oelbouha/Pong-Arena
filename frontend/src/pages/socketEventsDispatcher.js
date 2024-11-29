import DATA from "../store.js"


window.addEventListener('socket:message', e => {
    const msg = e.detail
    const event = {}

    if (msg.m == 'notif') {
        if (['friend_removed', 'friend_accepted', 'friend_declined'].includes(msg.type)) {
            event.type = 'friendrequestaccepted'
            event.detail = { user_id: msg.id}

            if (msg.type != 'friend_declined') {
                DATA.update_auth_user()
            }

        }  else if (msg.type == 'new_friend_request') {
            event.type = 'friendrequestreceived'
            event.detail = { user_id: msg.id}
        } else {
            event.type = 'notification',
            event.detail = {}
        }

        if (msg.type.startsWith('tournament')) {
            window.dispatchEvent(new CustomEvent('refresh:tournament', {
                bubbles: true,
                composed: true,
                detail: {
                    id: msg.tournament_id
                }
            }))
        }
    }

    if (event.type) {
        window.dispatchEvent(new CustomEvent(event.type, {
            composed: true,
            bubbles: true,
            detail: event.detail
        }))
    }
})
