const svgns = "http://www.w3.org/2000/svg";
const player_w = 30, player_h = 30, gap = 8, padding = 20, line_h = 20

function makeSvgRect(w, h, x, y, r = 0) {
    const rect = document.createElementNS(svgns, 'rect');
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('class', 'fill-glass');

    x && rect.setAttribute('x', x);
    y && rect.setAttribute('y', y);
    r && rect.setAttribute('rx', r);
    r && rect.setAttribute('ry', r);

    return rect
}

function makeSvgImage(w, h, x, y, r = 0, user) {
    const rect = document.createElementNS(svgns, 'rect');
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', 'white');

    x && rect.setAttribute('x', x);
    y && rect.setAttribute('y', y);
    r && rect.setAttribute('rx', r);
    r && rect.setAttribute('ry', r);

    const mask = document.createElementNS(svgns, 'mask')
    const maskId = `mask${parseInt(x)}${parseInt(y)}`
    mask.setAttribute('id', maskId)

    mask.append(rect)
    const image = document.createElementNS(svgns, 'image')
    image.setAttribute('mask', `url(#${maskId})`)
    image.setAttribute('href', user.profile_image)
    image.setAttribute("preserveAspectRatio", "xMidYMid slice")
    image.setAttribute('width', w);
    image.setAttribute('height', h);
    image.setAttribute('x', x);
    image.setAttribute('y', y);

    const group = document.createElementNS(svgns, 'g')
    group.append(mask)
    group.append(image)

    // const outline = document.createElementNS(svgns, 'rect');
    // outline.setAttribute('width', w + 2);
    // outline.setAttribute('height', h + 2);
    // outline.setAttribute('fill', 'none');
    // outline.setAttribute('stroke-width', '1');
    // x && outline.setAttribute('x', x - 1);
    // y && outline.setAttribute('y', y - 1);
    // r && outline.setAttribute('rx', r + 1);

    // if (user.win == true || user.win == false)
    //     outline.setAttribute('stroke', user.win?'green':'red');

    // group.append(outline)

    return group
}

function makeSvgLine(x0, y0, x1, y1) {
    const dir = x0 < x1 ? 1 : -1
    const seg_h = (y1 - y0) / 2 - 1
    const seg_w = (x1 - x0) - dir * 2
    const d = `M${x0} ${y0}v${Math.ceil(seg_h)}q0 1 ${dir} 1h${seg_w}q${dir} 0 ${dir} 1v${Math.floor(seg_h)}`

    const path = document.createElementNS(svgns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '.5')
    path.classList.add('stroke-glass')
    return path
}

function makePlayersRow(initial_count, row, prev_padding = null, prev_gap = null, round) {
    const count = initial_count / Math.pow(2, row)
    const y = row * (player_h + line_h) + padding

    let relative_padding, row_padding, row_gap

    if (prev_gap) relative_padding = (player_w + prev_gap) / 2
    else relative_padding = 0

    if (prev_gap == null) row_gap = gap
    else row_gap = 2 * relative_padding + prev_gap

    row_padding = prev_padding + relative_padding

    const rects = []

    for (let i = 0; i < count; ++i) {
        const x = i * (player_w + row_gap) + row_padding

        if (round) {
            rects.push(makeSvgImage(player_w, player_h, x, y, 4, round[i]))
        } else {
            rects.push(makeSvgRect(player_w, player_h, x, y, 4))
        }

        if (row) {
            const y0 = y - line_h, center = x + player_w / 2, g = player_w / 10
            let x0, x1, p

            x0 = x - relative_padding + player_w / 2
            x1 = center - g
            p = makeSvgLine(x0, y0, x1, y)
            rects.push(p)

            x0 = x + relative_padding + player_w / 2
            x1 = center + g
            p = makeSvgLine(x0, y0, x1, y)
            rects.push(p)
        }
    }

    return {
        rects,
        gap: row_gap,
        padding: row_padding
    }
}

export default function generateTournamentSvg(n = 8, rounds) {
    const rows = Math.log2(n) + 1
    const w = n * player_w + (n - 1) * gap + 2 * padding
    const h = rows * player_h + (rows - 1) * line_h + 2 * padding
    
    const svg = document.createElementNS(svgns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    
    let row_data = { padding }

    for (let i = 0; i < rows; ++i) {
        row_data = makePlayersRow(n, i, row_data.padding, row_data.gap, rounds[i])
        if (rounds[i] && rounds[i].length == 1) {
            const group = row_data.rects[0]
            group.lastElementChild.setAttribute('stroke', 'gold')
        }
        svg.append(...row_data.rects)
    }
    svg.setAttribute('id', 'tournamentTreeSvg')
    return svg
}