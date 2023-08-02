import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as path from 'node:path'

const OUT_DIR = 'out'
const CACHE_DIR = 'cache'
const CACHE_ENABLED = true
const CACHE_PREBUILD_ENABLED = true
const SUB_NAME = process.argv[2]

const LOG_ENABLED = false

const SINGLE_SUBMISSION = false

const search = 'What’s this bag? Never seen one before. On my apple tree in SW Missouri.'

function log(data) {
    if (LOG_ENABLED) {
        console.log(data)
    }
}

let splitCommentsProgress = 0

async function splitCommentsFileByThread(filename) {
    log('splitCommentsFileByParentId')
    const fileStream = fs.createReadStream(filename)

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    })

    const res = []

    for await (const line of rl) {
        const entry = JSON.parse(line)
        if (typeof entry !== 'undefined') {
            fs.appendFileSync(path.join(CACHE_DIR, entry.link_id.substring(3)), line + "\r\n")
        }
        if (splitCommentsProgress++ > 999) {
            process.stdout.write('.')
            splitCommentsProgress = 0
        }
    }
    fileStream.close()
}

if (CACHE_PREBUILD_ENABLED) {
    console.log('Prebuilding comments cache (each dot is 1k comments processed)')
    if (!fs.existsSync(CACHE_DIR)) {
        log('creating cache dir')
        fs.mkdirSync(CACHE_DIR)
    }
    await splitCommentsFileByThread(SUB_NAME + '_comments')
}

if (!fs.existsSync(OUT_DIR)) {
    log('creating out dir')
    fs.mkdirSync(OUT_DIR)
}

async function processFile(name, search, earlyReturn = true, appendCache = false) {
    log('processFile')
    const fileStream = fs.createReadStream(name)

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    })

    const res = []

    for await (const line of rl) {
        if (line.indexOf(search) !== -1) {
            if (appendCache && CACHE_ENABLED) {
                fs.appendFileSync(path.join(CACHE_DIR, search), line + "\r\n")
            }
            if (earlyReturn) {
                return JSON.parse(line)
            } else {
                res.push(JSON.parse(line))
            }
        }
    }
    fileStream.close()

    return res
}

async function processFileWithCache(name, search, updateCache = false) {
    log('processFileWithCache')
    const filename = path.join(CACHE_DIR, search)
    let comments = []
    if (fs.existsSync(filename)) {
        log('cache exists for '.search)
        const fileStream = fs.createReadStream(filename)

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        })

        for await (const line of rl) {
            comments.push(JSON.parse(line))
        }
        fileStream.close()
    } else if (updateCache) {
        log('no cache exists')
        comments = await processFile(name, search, false, true)
    }

    log(['comments count', comments.length])

    return comments
}

function processResponses(op, data) {
    log('processResponses')
    const responses = []

    data.map(element => {
        if (element.parent_id.substring(3) === op.id) {
            element.responses = processResponses({ ...element }, [...data]) || []
            responses.push(element)
        }
    })

    responses.sort((a, b) => b.score - a.score)
    log(['responses count', responses.length])
    return responses
}

async function getResponses(dataRaw, op) {
    const data = [...dataRaw]
    op.responses = processResponses(op, data)
}


function printComment(comment) {
    log('printComment')
    let commentHtml = '<div class="c">'
    commentHtml += '<h4>' + comment.author + '</h4>'
    commentHtml += '<p>' + markup(comment.body) + '</p>'
    commentHtml += '<p>' + comment.score + '</p>'
    comment.responses.forEach(element => {
        log('printing response')
        commentHtml += printComment(element)
    })
    commentHtml += '</div>'

    return commentHtml
}

function markup(text) {
    text = text.replaceAll(/\&gt\;(.*)\n/g, '<blockquote>$1</blockquote>')
    text = text.replaceAll("\n", '<br/>')
    text = text.replaceAll(/\[([^\(\)]+?)\]\(([^\[\]]+?)\)/g, '<a href="$2">$1</a>')
    return text
}

function removeNonalphanumeric(text) {
    return text.replaceAll(/[^a-zA-Z0-9]+/g, '_').replace(/(.*)_$/, '$1')
}

async function outputHtml(op) {
    const responseData = await processFileWithCache(SUB_NAME + '_comments', op.id, false)
    await getResponses(responseData, op)

    let html = '<html><head><style>body{font-family:sans-serif}.c{padding-left:10px;border-left:solid 1px gray}img{max-width:100%}</style>'
    html += '<title>' + op.title.trim() + '</title></head><body>'

    html += '<h1><a href="' + op.url?.trim() + '">' + op.title.trim() + '</a></h1>'

    if (typeof op.preview !== 'undefined') {
        op.preview?.images.forEach(element => {
            const href = element.source.url
            const src = element.resolutions.length > 0 ? element.resolutions.pop().url : href

            html += '<a href="' + href + '"><img src="' + src + '"/></a>'
        });
    }

    if (typeof op.media_metadata !== 'undefined' && typeof op.gallery_data !== 'undefined') {
        op.gallery_data?.items.forEach(element => {
            if (op.media_metadata === null) {
                if (typeof element.caption !== 'undefined' && element.caption !== ''){
                    html += '<p>' + element.caption + '</p>'
                }

                return false
            }
            if (typeof op.media_metadata[element.media_id].s === 'undefined') {
                return false
            }
            const href = op.media_metadata[element.media_id].s.u
            const src = op.media_metadata[element.media_id].p.pop().u

            html += '<a href="' + href + '"><img src="' + src + '"/></a>'
        });
    }

    if (op.selftext) {
        html += '<p>' + markup(op.selftext) + '</p>'
    }

    op.responses.forEach((comment) => { html += printComment(comment) })

    html += '</body>'

    fs.writeFileSync(OUT_DIR + '/' + removeNonalphanumeric(op.title.trim()).substring(0, 100) + '_' + op.id + '.html', html)

}

if (SINGLE_SUBMISSION) {
    const op = await processFile(SUB_NAME + '_submissions', search)
    outputHtml(op)
} else {
    console.log("\nProcessing submissions (each dot is 100 posts)")
    const fileStream = fs.createReadStream(SUB_NAME + '_submissions')

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    })

    const res = []

    let submissionsProgress = 0
    for await (const line of rl) {
        const op = JSON.parse(line)
        await outputHtml(op)
        if (submissionsProgress++ > 99) {
            process.stdout.write('.')
            submissionsProgress = 0
        }
    }
    fileStream.close()
    console.log('')
}
