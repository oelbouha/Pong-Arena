

class RouteChangeEvent extends CustomEvent {
    constructor(more) {
        super('routechange', more)
    }
}
export class SilentRouteChangeEvent extends CustomEvent {
    constructor(more) {
        super('silentroutechange', more)
    }
}

export default RouteChangeEvent