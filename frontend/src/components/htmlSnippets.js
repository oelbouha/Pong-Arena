import { games_images } from "../utils/index.js"


export function userItemHtml(user, actions) {
    const btn = (action, user) => /*html*/ `
        <button
            class="color-light-3 fs-1-25 fw-300 bg-none capitalize"
            data-action="${action}"
            data-user="${user}"
        >
            ${action}
        </button>
    `
    return /*html*/`
        <div
            data-user="${user.id}"
            class="user flex align-center gap-1 p-1 rounded-0-5 border-glass"
        >
            <wc-link
                data-to="/users/${user.username}/"
                class="flex align-center gap-1"
            >
                <div class="flex align-end relative no-shrink">
                    <img
                        class="img-cover rounded-pill"
                        style="height: 3.5rem; width: 3.5rem;"
                        src="${user.profile_image}">
                </div>
                <div class="column">
                    <h2 class="fw-400">${user.name}</h2>
                    <h3 class="fw-300">@${user.username}</h3>
                </div>
            </wc-link>
            <div class="action flex gap-0-5 ml-auto">
                ${
                    actions.map(a => btn(a, user.id)).join('')
                }
            </div>
        </div>
    `
}
export function userItemSkeletonHtml(n = 1) {
    const skeleton = /*html*/`
        <div class="skeleton relative flex align-center gap-1 p-1 rounded-0-5 border-glass">
            <div class="flex align-center gap-1">
                <div class="flex align-end relative no-shrink">
                    <div
                        class="img-cover rounded-pill bg-glass"
                        style="height: 3.5rem; width: 3.5rem;"
                    ></div>
                </div>
                <div class="column gap-0-25">
                    <div class="rounded-pill bg-glass" style="height: .75rem;width: 10rem;"></div>
                    <div class="rounded-pill bg-glass"  style="height: .5rem;width: 8rem;"></div>
                </div>
            </div>
            <div class="action flex gap-0-5 ml-auto">
                <div class="rounded-pill bg-glass" style="height: .75rem;width: 6rem;"></div>
            </div>
            <div class="flash-container" style=" position: absolute; top: 0; left: 0; height: 100%; width: 100%; border-radius: .5rem; overflow: hidden; ">
                <div class="flash absolute top-0 left-0 w-100 h-100"></div>
            </div>
        </div>
    `
    let ret = ''
    for (let i = 0; i < n; ++i) ret += skeleton
    return ret
}
export function inlineTournamentItemSkeletonHtml(n = 1) {
    const skeleton = /*html*/`
        <div class="skeleton relative flex align-center gap-1 p-1 rounded-0-5 border-glass">
            <div class="flex align-center gap-1">
                <div class="flex align-end relative no-shrink">
                    <div
                        class="img-cover rounded-0-5 bg-glass"
                        style="height: 3.5rem; width: 3.5rem;"
                    ></div>
                </div>
                <div class="column gap-0-25">
                    <div class="rounded-pill bg-glass" style="height: .75rem;width: 10rem;"></div>
                    <div class="rounded-pill bg-glass"  style="height: .5rem;width: 8rem;"></div>
                </div>
            </div>
            <div class="action flex gap-0-5 ml-auto">
                <div class="rounded-pill bg-glass" style="height: .75rem;width: 6rem;"></div>
            </div>
            <div class="flash-container" style=" position: absolute; top: 0; left: 0; height: 100%; width: 100%; border-radius: .5rem; overflow: hidden; ">
                <div class="flash absolute top-0 left-0 w-100 h-100"></div>
            </div>
        </div>
    `
    let ret = ''
    for (let i = 0; i < n; ++i) ret += skeleton
    return ret
}
export function inlineTournamentItemHtml(tournament, action=null) {
    const actionHtml = /*html*/ `
        <div class="action flex gap-0-5 ml-auto">
            <button
                class="color-light-3 fs-1-25 fw-300 bg-none capitalize"
                data-action="${action}"
                data-tournament="${tournament.id}"
            >
                ${action}
            </button>
        </div>
    ` 
    return /*html*/`
        <div
            data-tournament="${tournament.id}"
            class="friend flex align-center gap-1 p-1 rounded-0-5 border-glass"
        >
            <wc-link
                data-to="/tournaments/${tournament.id}/"
                class="flex align-center gap-1"
            >
                <div class="flex align-end relative no-shrink">
                    <img
                        class="img-cover rounded-pill"
                        style="height: 3.5rem; width: 3.5rem;"
                        src="${tournament.image}">
                </div>
                <div class="column">
                    <h2 class="fw-400">${tournament.name}</h2>
                    <h3 class="fw-300">@${tournament.admin.username}</h3>
                </div>
            </wc-link>
            ${ action && actionHtml}
        </div>
    `
}

function activeTournamentFooter(tournament, actions) {
    return actions.map(action => {
        let bg_class = 'bg-accent'
        let name = action
        if (typeof action == 'object') {
            bg_class = action.danger ? 'bg-red':bg_class
            name = action.name
        }
        return /*html*/ `
            <button
                data-tournament=${tournament.id}
                data-action="${name.toLowerCase()}"
                class="action ${bg_class} rounded-0-25 p-1 py-0-5"
            >
                ${name}
            </button>
        `
    }).join('')
}
function concludedTrounamentFooter() {
    return /*html*/`
        <h5 class="fw-500 text-center uppercase">concluded</h5>
    `
}
export function tournamentItemHtml(tournament, action = 'Leave', classes="") {
    return /*html*/`

        <div
            class="tournament column gap-0-5 p-0-5 rounded-0-5 border-glass ${classes}"
            style="width: 11rem;"
        >
            <wc-link data-to="/tournaments/${tournament.id}/" class="column gap-0-5 ">
                <div class="flex align-end">
                    <img
                        class="img-cover rounded-0-5 square"
                        src="${tournament.image}">
                </div>
                <h3 class="fw-400 capitalize">${tournament.name}</h3>
            </wc-link>
            <div class="flex align-center gap-0-5">
                <div class="flex align-end relative">
                    <img
                        class="img-cover bg-silver rounded-0-5"
                        style="width: 3rem; height: 3rem;" 
                        src="${tournament.game.image}" />
                </div>
                <wc-link data-to="/users/${tournament.admin.username}" class="flex align-end relative">
                    <img
                        class="img-cover rounded-0-5"
                        style="height: 3rem; width: 3rem;"
                        src="${tournament.admin.profile_image}">
                </wc-link data-to="/chat/">
                <h4 class="fs-1-25 fw-400 rounded-0-5 grid align-center justify-center"
                    style="border: 1px solid #c0c0c04d; width: 3rem; height: 3rem;">${tournament.capacity}</h4>
            </div>
            <hr class="bg-glass m-0 mt-auto">
            <div class="column gap-0-5">
                <div class="flex gap-0-5 align-center">
                   <svg width="1.5rem" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9H21M9 15L11 17L15 13M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.3843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="silver" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h5 class="fw-500 mt-0-15">${ tournament.date.toDateString() }</h5>
                </div>
                ${
                    tournament.concluded ? 
                        concludedTrounamentFooter()
                        : activeTournamentFooter(tournament, action)
                }                    
            </div>
        </div>
    `
}

export function historyItemHtml(entry, leftUserId = null) {
    let me, opponent
    if (leftUserId) {
        me = entry.p1.id == leftUserId ? entry.p1 : entry.p2
        opponent = entry.p1.id == leftUserId ? entry.p2 : entry.p1
    } else {
        me = entry.p1
        opponent = entry.p2
    }
    const win = me.score > opponent.score

    return /*html*/`
        <div class="flex align-center gap-1 p-1 rounded-0-5 border-glass">
            <div class="left flex gap-1">
                <div class="flex align-end relative">
                    <img
                        class="img-cover rounded-pill ${win?'winner':'loser'}"
                        style="height: 3.5rem; width: 3.5rem;"
                        src="${me.profile_image}">
                </div>
                <div class="column">
                    <h3 class="fw-300">score</h3>
                    <h2 class="fw-400">${me.score}</h2>
                </div>
            </div>
            <div class="column align-center relative mx-auto">
                <img
                    class="img-cover rounded-1 bg-silver"
                    style="height: 3.5rem; width: 3.5rem;"
                    src="${games_images[entry.game]}">
                <h3 class="fw-400 fs-1 capitalize">${entry.game}</h3>
            </div>
            <div class="right flex gap-1">
                <div class="column align-end">
                    <h3 class="fw-300">score</h3>
                    <h2 class="fw-400 ">${opponent.score}</h2>
                </div>
                <div class="flex align-end relative">
                    <img
                        class="img-cover rounded-pill ${win?'loser':'winner'}"
                        style="height: 3.5rem; width: 3.5rem;"
                        src="${opponent.profile_image}">
                </div>
            </div>
        </div>
    `
}
