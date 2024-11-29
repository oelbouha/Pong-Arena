import { user_defaults } from "./utils/index.js"
import API from "./networking.js"

const path_callbacks_map = new Map()

const store = {}

function get_parent_key_pair(path) {
    const keys = path.split('.')
    const key = keys.pop()
    let parent = store
    while (keys.length) {
        parent = parent[keys.shift()]
        if (!parent) {
            return
        }
    }
    return {parent, key}
}

const DATA = {
    set: function(path, value) {
        const {parent, key} = get_parent_key_pair(path)

        const old_value = parent[key]

        if (value == null || value == undefined)
            delete parent[key]
        else if (Array.isArray(value))
            parent[key] = [...value]
        else if (typeof value == 'object')
            parent[key] = {...value}
        else
            parent[key] = value

        const set = path_callbacks_map.get(path)
        if (set) {
            for (let callback of set)
                callback(old_value, parent[key])
        }
    },

    get: function(path) {
        const {parent, key} = get_parent_key_pair(path)
        return parent[key]
    },

    set_authenticated_user: function(user) {
        user = user_defaults(user)
        DATA.set('auth_user', user)
        return user
    },
    update_auth_user: function() {
        const res = API.get(API.urls.me)

        if (res.ok) {
            this.set_authenticated_user(res.body)
        }
    },

    observe: function(path, callback) {
        let set = path_callbacks_map.get(path)
        if (!set) {
            set = new Set()
            path_callbacks_map.set(path, set)
        }
        set.add(callback)

        return () => set.delete(callback)
    },
}

export function set_authenticated_user(user) {
    user = user_defaults(user)
    DATA.set('auth_user', user)
    return user
}

export default DATA
