
export const users = [
    {
        id: 1,
        username: 'ysalmi',
        name: 'Youssef Salmi',
        profile_image: 'https://cdn.intra.42.fr/users/2d8f609c563a84bb14ad7a716cb9a31c/ysalmi.jpg',
        profile_banner: 'https://i.pinimg.com/originals/f1/ba/ff/f1baff635dc0c91262eb7e802d861238.jpg',
        is_friend: true,
        blocked: false
    },
    {
        id: 2,
        username: 'mtaib',
        name: 'Mohamed Taib',
        profile_image: 'https://cdn.intra.42.fr/users/55ff29148889fa2413c930488d85323e/mtaib.jpg',
        profile_banner: 'https://i.pinimg.com/originals/f1/ba/ff/f1baff635dc0c91262eb7e802d861238.jpg',
        is_friend: false,
        blocked: false
    },
    {
        id: 3,
        username: 'oelbouha',
        name: 'Outman Elbouhali',
        profile_image: 'https://cdn.intra.42.fr/users/edc53ce083560ce32a76f55ff0c1e231/oelbouha.jpg',
        profile_banner: 'https://i.pinimg.com/originals/f1/ba/ff/f1baff635dc0c91262eb7e802d861238.jpg',
        is_friend: true,
        blocked: true
    },
    {
        id: 4,
        username: 'fhihi',
        name: 'Fouad Hihi',
        profile_image: 'https://cdn.intra.42.fr/users/db11b514e9c080ff9cc063eba784e756/fhihi.jpg',
        profile_banner: 'https://i.pinimg.com/originals/f1/ba/ff/f1baff635dc0c91262eb7e802d861238.jpg',
        is_friend: false,
        blocked: false
    },
    {
        id: 5,
        username: 'yajallal',
        name: 'Yassine Ajallal',
        profile_image: 'https://cdn.intra.42.fr/users/d4ace32b3dfad55189990877dc6e4d93/yajallal.jpg',
        profile_banner: 'https://i.pinimg.com/originals/f1/ba/ff/f1baff635dc0c91262eb7e802d861238.jpg',
        is_friend: true,
        blocked: false
    },
]

export const stats = {
    'Pong': {
        matches: 23,
        wins: 12,
        losses: 11
    },
    'HandSlap': {
        matches: 15,
        wins: 7,
        losses: 8
    }
}

export const history = [
    {
        first_player: {
            ...users[0],
            score: 7
        },
        second_player: {
            ...users[2],
            score: 5
        },
        game: {
            name: 'Pong',
            image: "https://cdn-icons-png.flaticon.com/512/138/138451.png",
            goal: 3,
            exchanges: 19
        },
    },
    {
        first_player: {
            ...users[0],
            score: 5
        },
        second_player: {
            ...users[3],
            score: 12
        },
        game: {
            name: 'HandSlap',
            image: "https://s.cafebazaar.ir/images/icons/com.sp.casual.slap.that.red.hands.game-e032c84e-f58d-4afc-bbd8-b0136f91a8a3_512x512.png?x-img=v1/resize,h_256,w_256,lossless_false/optimize",
            goal: 5,
            exchanges: 11
        },
    },
    {
        first_player: {
            ...users[0],
            score: 18
        },
        second_player: {
            ...users[3],
            score: 12
        },
        game: {
            name: 'HandSlap',
            image: "https://s.cafebazaar.ir/images/icons/com.sp.casual.slap.that.red.hands.game-e032c84e-f58d-4afc-bbd8-b0136f91a8a3_512x512.png?x-img=v1/resize,h_256,w_256,lossless_false/optimize",
            goal: 5,
            exchanges: 28
        },
    },
    {
        first_player: {
            ...users[1],
            score: 10
        },
        second_player: {
            ...users[0],
            score: 15
        },
        game: {
            name: 'Pong',
            image: "https://cdn-icons-png.flaticon.com/512/138/138451.png",
            goal: 3,
            exchanges: 25
        },
    },
    {
        first_player: {
            ...users[0],
            score: 10
        },
        second_player: {
            ...users[1],
            score: 15
        },
        game: {
            name: 'Pong',
            image: "https://cdn-icons-png.flaticon.com/512/138/138451.png",
            goal: 3,
            exchanges: 19
        },
    },
    {
        first_player: {
            ...users[0],
            score: 10
        },
        second_player: {
            ...users[4],
            score: 15
        },
        game: {
            name: 'Pong',
            image: "https://cdn-icons-png.flaticon.com/512/138/138451.png",
            goal: 5,
            exchanges: 100
        },
    },
]

export const games = [
    history[0].game,
    history[1].game,
]

export const tournaments = [
    {
        id: 1,
        name: 'Pong Universe',
        image: 'https://s.cafebazaar.ir/images/icons/com.sp.casual.slap.that.red.hands.game-e032c84e-f58d-4afc-bbd8-b0136f91a8a3_512x512.png?x-img=v1/resize,h_256,w_256,lossless_false/optimize',
        game: history[0].game,
        capacity: 4,
        admin: users[2],
        concluded: true,
        date: new Date()
    },
    {
        id: 2,
        name: 'Paddle Showdown',
        image: 'https://s.cafebazaar.ir/images/icons/com.sp.casual.slap.that.red.hands.game-e032c84e-f58d-4afc-bbd8-b0136f91a8a3_512x512.png?x-img=v1/resize,h_256,w_256,lossless_false/optimize',
        game: history[1].game,
        admin: users[3],
        capacity: 8,
        concluded: false,
        date: new Date()
    },
    {
        id: 3,
        name: 'Paddle Showdown',
        image: 'https://s.cafebazaar.ir/images/icons/com.sp.casual.slap.that.red.hands.game-e032c84e-f58d-4afc-bbd8-b0136f91a8a3_512x512.png?x-img=v1/resize,h_256,w_256,lossless_false/optimize',
        game: history[1].game,
        admin: users[1],
        capacity: 16,
        concluded: false,
        date: new Date()
    },
]


// const user = users[0]

// comp.innerHTML = `
//     <wc-profile ${attrs_to_str(user)}></wc-profile>
// `