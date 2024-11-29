export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function addEventListener(elems, event, listener, more=undefined)
{
    if (!Array.isArray(elems)) elems = [elems]
    
    elems.forEach(el => { el.addEventListener(event, listener, more) })

    return { 
        unregister: () => {
            elems.forEach(el => { el.removeEventListener(event, listener) })
        }
    }
}

export function parseJwt (token)
{
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
}


const validators = {
    required: function(data) {
        if (data.length == 0) return { valid: false, message: "field is required" }
        return { valid: true }
    },
    minmax: function(data, param, min=true) {
        const r = new RegExp(/\d+$/)
        if (!r.test(param)) {
            return { valid: true }
        }
        param = parseInt(param)
        if ((min && data.length < param) || (!min && data.length > param)) {
            return {
                valid: false,
                message: `length must be ${min?'greater':'less'} or equal to ${param}`
            }
        }
        return { valid: true }
    },
    min: function(data, param) { return this.minmax(data, param) },
    max: function(data, param) { return this.minmax(data, param, false) },

    include: function(data, param) {
        const r = new RegExp(`^[${param}]*$`)

        if (!r.test(data)) return { valid: false , message: `must only contain ${param}`}

        return { valid: true }
    },
    exclude: function(data, param) {
        const r = new RegExp(`^[^${param}]*$`)

        if (!r.test(data)) return { valid: false, message: `must not contain ${param}` }

        return { valid: true }
    },

    start_with: function(data, param) {
        const r = new RegExp(`^${param}`)

        if (!r.test(data)) return { valid: false, message: `must starts with ${param}` }

        return { valid: true }
    },
    end_with: function(data, param) {
        const r = new RegExp(`${param}$`)

        if (!r.test(data)) return { valid: false, message: `must ends with ${param}` }

        return { valid: true }
    },
    email: function(data) {
        const r = new RegExp(/^[a-zA-Z]((?:[\.-_])?[a-zA-Z0-9])+@([\w-]+\.)+[a-zA-Z]{2,4}$/)
        const emailTester = new RegExp(/^[a-zA-Z][a-zA-Z0-9\.]+@([\w-]+\.)+[\w-]{2,4}$/)

        if (!emailTester.test(data)) return { valid: false, message: "must be an email"}
        return { valid: true }
    }
}

function msgsToString() {
    let ret = ''
    this.forEach(el => ret += `- ${el}\n`)
    ret.trimEnd('\n')
    return ret
}

export function validate(value, rules)
{
    const messages = []

    if (typeof rules == 'string')
        rules = rules.split(' | ')

    if (!rules.includes('required') && !value.length) return messages

    rules.forEach(rule => 
        {
            let pos = rule.search(':'); if (pos == -1) pos = rule.length
            const key = rule.slice(0, pos)
            const param = rule.slice(pos + 1)
            
            if (!validators[key]) {
                return
            }
            const ret = validators[key](value, param)
            if (!ret.valid) messages.push(ret.message)
        }
    )
    messages.toString = msgsToString
    return messages
}


export function countdownButton(btn, date, template="{{counter}}") {
    btn.classList.add('inactive')

    const childNodes = [...btn.childNodes]

    const updateClock = (time) => {
        const minutes = parseInt(time / 60)
        const seconds = (time % 60).toString().padStart(2, '0')
        const clock = minutes <= 0 ? seconds : `${minutes}:${seconds}`
        btn.textContent = template.replaceAll('{{counter}}', clock)
    }
    const intervalId = setInterval(() => {
        const remaining = parseInt((date - Date.now()) / 1000)
        if (remaining <= 0) {
            btn.classList.remove('inactive')
            btn.replaceChildren(...childNodes)
            return clearInterval(intervalId)
        }
        updateClock(remaining)
    }, 200)
}


export function displayInputsErrors(root, errors) {
    const inputs = root.querySelectorAll('wc-input')
    inputs.forEach(input => {
        const field = input.getAttribute('name')
        if ( ! errors[field] ) return

        const error = errors[field]
        let message 
        if (Array.isArray(error)) message = errors[field].map(s => `• ${s}\n`).join('')
        else message = `• ${error}`
        input.displayError(message)
    })
}

export function get_validated_data(root)
{
    const inputs = Array.from(root.querySelectorAll('wc-input'))
    inputs.push({validate: () => true})

    const err = inputs.reduce((p, c) => {
        if (typeof p != "boolean")
            p = !p.validate()
        
        return !c.validate() || p
    })

    if (err) return null
    
    inputs.pop()
    const ret = {}
    inputs.forEach(input => { if(input.value) ret[input.getAttribute('name')] = input.value})
    return ret
}

export function media(path) {
    return '/media/' + path
}


function getFriendById(id) {
    const friend = this.friends.find(friend => friend.id == id)
    return friend ? user_defaults(friend) : null
}
function noFriend() { return null }
export function user_defaults(user) {
    if (user.profile_image && user.profile_image.startsWith(media('')))
        return user
    if (user.profile_image && user.profile_image.startsWith('/assets/'))
        return user

    user.profile_image = user.profile_image ? media(user.profile_image)
                            : '/assets/default-avatar.avif'
    user.profile_banner = user.profile_banner ? media(user.profile_banner)
                            : '/assets/banner-default.jpg'
    
    if (user.tournaments)
        user.tournaments = user.tournaments.map(t => tournament_defaults(t))
    if (user.history)
        user.history = user.history.map(h => history_defaults(h))
    
    if (user.pong && !user.pong_his)
        user.pong_his = user.pong.map(h => history_defaults(h))
    if (user.slap && !user.pong_his)
        user.slap_his = user.slap.map(h => history_defaults(h))


    { // stats
        user.pong = {
            matches: user.pong_count,
            wins: user.pong_wins,
            losses: user.pong_count - user.pong_wins
        },
        user.slap = {
            matches: user.slap_count,
            wins: user.slap_wins,
            losses: user.slap_count - user.slap_wins
        }
    }
    delete user.pong_count
    delete user.pong_wins
    delete user.slap_count
    delete user.slap_wins
        
    user.name = `${user.first_name} ${user.last_name}`
    user.blocked = user.is_friend == 'blocked'
    user.getFriendById = user.friends ? getFriendById : noFriend
    return user
}

export function history_defaults(h) {
    if (h.p1.score != undefined) return h

    h.p1 = user_defaults(h.p1)
    h.p2 = user_defaults(h.p2)
    h.p1.score = h.p1_score
    h.p2.score = h.p2_score
    h.game = h.type.toLowerCase()
    delete h.type
    delete h.p1_score
    delete h.p2_score
    return h
}

export const games_images = {
    pong: "/assets/pong.png",
    slap: "/assets/slap.png",
}
const tournamet_getters = {
    is_locked: {
        get: function () { return this.status == 'LOCK'}
    },
    is_full: {
        get: function () { return this.participants_count == this.capacity }
    },
    is_lockable: {
        get: function () { return this.is_full && !this.is_locked }
    },
    is_joinable: {
        get: function () { return !this.is_full && !this.is_locked }
    },
    is_concluded: {
        get: function () { return this.status == 'FINISH' }
    },
    is_ongoing: {
        get: function () { return this.satus == 'ONGO'}
    }
}
function tournament_action(id) {
    if (this.is_lockable && this.admin.id == id) return 'lock'
    if (this.is_joinable && !this.participants.find(u => u.id == id))
        return 'join'
    else return 'leave'
}
export function tournament_defaults(tournament) {
    if (tournament.hasOwnProperty('is_locked'))
        return tournament

    tournament.image = tournament.image ? media(tournament.image)
                        : '/assets/default-avatar.avif'
    tournament.date = new Date(tournament.created_at)
    tournament.game = { image: games_images[tournament.game.toLowerCase()] }
    tournament.admin = user_defaults(tournament.admin)
    tournament.participants = tournament.participants.map(p => user_defaults(p))
    if (tournament.history)
        tournament.history = tournament.history.map(h => history_defaults(h))
    else tournament.history = []
    tournament.action = tournament_action
    tournament.final_round = tournament.rounds
    return Object.defineProperties(tournament, tournamet_getters)
}



export function create_element(html) {
    const outer = document.createElement('div')
    outer.innerHTML = html
    return outer.firstElementChild
}

let notifier = null
export function set_notifier(n) {
    if (n.notify) notifier = n
}
export function notify(notification) {
    if (!notifier) return
    notifier.notify(notification)
}