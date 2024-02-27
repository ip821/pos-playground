const Softpay = function() {

    const win = window, doc = win.document, prefix = 'zpy_', lock = Object.freeze, undef = void 0
    let loaded = false, events = []

    const now = () => new Date().getTime()
    const def = (val) => val === '' || (typeof val == 'number' && isNaN(val)) ? false : val != null
    const has = (o, prop, fn) => {
        const has = def(o) && typeof o == 'object' && prop in o
        if (has) {
            fun(fn, null, o[prop])
        }
        return has
    }
    const f   = (val) => typeof val == 'function' ? val : null
    const fun = (fn, val, arg) => {
        let v
        if (f(fn)) {
            try {
                v = fun(fn(arg), val)
            } catch (e) {
                v = fun(val, null, e)
            }
        } else {
            v = def(fn) ? fn : null
        }
        return v
    }
    const num = (val, arg) => {
        switch (typeof val) {
            case 'number':   return def(val) ? Math.trunc(val) : null // always integer!
            case 'string':   return def(val) ? num(+val) : null       // +'' = 0
            case 'function': return num(fun(val, null, arg))
            default:         return null
        }
    }
    const str = (val, arg) => {
        switch (typeof val) {
            case 'string':   return def(val) ? val : null
            case 'function': return str(fun(val, null, arg))
            default:         return def(val) ? val + '' : null
        }
    }
    const arr = (val, reverse = false, type = 'str') => {
        const vals = Array.isArray(val) ? val : [val],
              fn   = type == 'str' ? str : num
        let a = []
        for (v of vals) {
            if (def(v = fn(v))) {
                reverse ? a.unshift(v) : a.push(v)
            }
        }
        return a.length == 0 ? null : a
    }
    const toString = (val) => {
        switch (typeof val) {
            case 'object': {
                if (val === null) return 'null'
                let s = '['
                for (const name in val) {
                    if (name.startsWith('_')) continue
                    let v = val[name]
                    if (def(v)) {
                        if (def(v = toString(v))) {
                            if (s.length > 1) {
                                s += '; ';
                            }
                            s += `${name}: ${v}`
                        }
                    }
                }
                return `${s}]`
            }
            case 'function': return null
            default: return str(val)
        }
    }

    const qualify   = (key, qualify = true) => def(key) ? (!qualify || key.startsWith(prefix)) ? key : `${prefix}${key}` : null
    const unqualify = (key) => def(key) ? key.startsWith(prefix) ? key.substring(prefix.length) : key : null

    const key = (val, entries) => {
        for (const key in entries) {
            if (val == entries[key]) {
                return key
            }
        }
        return null
    }
    const on = (scope, names, opts = null, fn) => {
        if (f(opts)) {
            fn   = opts
            opts = null
        }
        names = typeof names == 'string' ? [names] : names
        for (const name of names) {
            scope.addEventListener(name, fn, opts)
        }
    }

    // See https://developer.softpay.io
    const Failures = {
        UNKNOWN_ERROR:       1,
        UNSUPPORTED:       200, // e.g. non-supported browser, trying to call intents off device, etc.
        INVALID_USAGE:     310, // e.g. undefined arg where not allowed or duplicate processing
        INVALID_ARGUMENT:  320, // e.g. invalid or used request id
        SOFTPAY_NO_APP:    400, // when fallback is triggered
        ABORTED:           800, // Softpay
        ABORTED_BY_CLIENT: 810, // client, request can still be processing in Softpay (no cancellation)!
        REQUEST_FAILED:    950, // callback with non success state

        name: (code) => {
            const k = key(code, Failures)
            return def(k) ? `${code}/${k}` : def(code) ? code : `${Failures.name(Failures.UNKNOWN_ERROR)} (${code})`
        }
    }

    const Processed = {
        CREATED:    0,
        LAUNCHING:  1,
        PROCESSING: 2,
        UNKNOWN:    3, // client side, with or with callback
        ABORTED:    4, // client side, only if <= LAUNCHING
        SUCCEEDED:  5,
        FAILED:     6,

        name: (processed) => def(processed) ? `${processed}/${key(processed, Processed)}` : -1
    }

    const buildResponseType = (namespaced = false) => {
        const n = namespaced ? prefix : ''
        const response = {
            APP_ID:        `${n}appId`,
            REQUEST_ID:    `${n}requestId`,
            REQUEST_STATE: `${n}requestState`, // SUCCEEDED, FAILED, ABORTED in Softpay, or UNKNOWN locally
            TOKEN:         `${n}token`,
            LOCALE:        `${n}locale`,
            TIME:          `${n}time`,
            CODE:          `${n}code`,
            ACTION:        `${n}action`, // (short) method name: 'appId', 'pending', 'payment'
            
            CALLBACK:      `${n}callback`,
            FALLBACK:      `${n}fallback`,
            UNKNOWN:       `${n}unknown`,
        }
        if (namespaced) {
            response.namespaced = true
        }
        return lock(response)
    }

    const store = () => {
        const cookie = doc.cookie, // will not work for local file
              pairs  = cookie.length == 0 ? [] : cookie.split(/\s*;\s*/g),
              vals   = {}
        for (const pair of pairs) {
            const [k, tv] = pair.split('=', 2)
            if (!k.startsWith(prefix)) continue
            const [t, v] = win.unescape(tv).split(':', 2)

            let val
            switch (t) {
                case 'number':  val = num(v);      break
                case 'boolean': val = v == 'true'; break
                default:        val = v + '';      break
            }
            vals[k] = val
        }
        return vals
    }
    store.get = (key, mapper, maxAge) => {
        const k    = qualify(key),
              vals = store()

        const map = (v) => {
            if (def(mapper)) {
                if (def(v = fun(mapper, null, v))) {
                    v = store.set(k, v, maxAge)
                }
            }
            return v
        }
        return k ? map(vals[k]) : vals
    }
    store.set = (key, val, maxAge) => {
        if (def(val)) {
            const k = qualify(key)
            let v = val
            if (has(val, 'get') && has(val, 'set')) {
                v   = val.set
                val = val.get
            }
            try {
                let cookie = `${k}=${win.encodeURIComponent(`${typeof v}:${v}`)}`
                const age = num(maxAge)
                if (def(age)) {
                    cookie += `; max-age=${age}`
                }
                doc.cookie = cookie
            } catch (e) { }
        }
        return val
    }

    const raiseFailure = (err, message, options = null, action = null) => {
        const failure = buildFailure(err, message, action)
        dispatch(options, null, failure)
        throw failure
    }
    const require = (val, message, options = null, code = null) => {
        val = fun(val, (e) => {
            raiseFailure(code ?? e instanceof ReferenceError ? Failures.INVALID_USAGE : Failures.UNSUPPORTED, fun(message) ?? e, options) // val -> undefined
        })
        if (!def(val)) {
            raiseFailure(code ?? Failures.INVALID_USAGE, fun(message), options)
        } else if (val === false) {
            raiseFailure(code ?? Failures.INVALID_ARGUMENT, fun(message), options)
        }
        return val === true ? null : val
    }

    const dispatch = (options, response, failure = null, request = null) => {
        response = def(response) ? response : {}
        // Can still be failed if unknown!
        const Response = softpay.Response,
              state    = str(response[Response.REQUEST_STATE]) ?? Response.UNKNOWN,
              failed   = def(failure) || def(response[Response.FALLBACK]) || state != 'SUCCEEDED',
              fn       = (failed ? options?.onFailure : options?.onSuccess) ?? options?.onResponse

        options?.log(response)
        options?.log(failure)

        if (def(fn)) {
            emit(() => fn(response, failure, request))
        }
    }
    const emit = (fn, delay = 0) => {
        if (loaded) {
            if (delay == 0) {
                win.setTimeout(fn)
                return null
            }
            const timer = { state: 0 }
            timer.abort = () => {
                if (def(timer.timer)) {
                    win.clearTimeout(timer.timer)
                    timer.timer = null
                    timer.state = -now()
                }
            }
            timer.timer = win.setTimeout(() => { timer.timer = null; timer.state = now(); fn() }, delay)
            timer.toString = () => def(timer.timer) ? `${timer.timer}=${delay}ms` : `${timer.state}`
            return timer
        }
        events.push(fn)
        return null
    }
    const dispatchResponse = (options, request, err, url) => {
        const [response, failure] = buildResponse(options, request?._pending, err, url)
        if (def(response) || def(failure)) {
            dispatch(options, response, failure, request)
        }
        return [response, failure]
    }
    const buildFailure = (err, message, action = null, cause = null) => {
        let code = err, opts = null
        if (err instanceof Error) {
            cause = err
            code  = err.code ?? err instanceof TypeError ? Failures.UNSUPPORTED : Failures.UNKNOWN_ERROR
        }
        if (cause instanceof Error) {
            opts = { cause: cause }
            message ??= cause.message
        }

        let msg = def(message) ? def(action) ? `${message} (client.${action})` : message : def(action) ? action : 'unknown error'
        if (def(cause) && !msg.includes(cause.message)) {
            msg += ` / ${cause.message}`
        }

        const failure = Error(`Softpay error: ${Failures.name(code)} - ${msg}`, opts)
        failure.code   = code
        failure.action = action
        return failure
    }

    const functionDefault = (val) => {
        // no default
        if (!def(val)) return val
        // boolean
        if (val == 'true')  return true
        if (val == 'false') return false
        // string
        let v = /^['"](.+)['"]$/.exec(val)
        if (v?.length == 2) return v[1]
        // number
        return num(val)
    }
    const buildFunction = (fn, scope, options) => {
        let nameAndParams = /^\s*function\s*(\w+)\s*\(([^(]*)\)/g.exec(fn)
        if (nameAndParams?.length <= 2) {
            return fn
        }
        const name   = nameAndParams[1],
              params = def(nameAndParams[2]) ? nameAndParams[2].split(/\s*,\s*/) : [],
              sym    = Symbol(name)

        const scoped = { [sym](...args) {
            if (args.length == 1) {
                let arg = args[0]
                if (typeof arg == 'object' && !(arg instanceof URL)) {
                    args = []
                    if (arg instanceof URLSearchParams) {
                        const a = {}
                        for (const [k, v] of arg) {
                            a[k] = v
                        }
                        arg = a // fall-through
                    }
                    for (const param of params) {
                        const [p, d] = param.split(/\s*=\s*/), a = arg[p]
                        // null is an explicit argument, undefined must default
                        args.push(a !== undef ? a : functionDefault(d))
                    }
                }
            }
            try {
                return fn.apply(fn, args) // function is its own scope
            } catch (e) {
                if (def(e.code)) { // if so, already handled
                   throw e
                }
                raiseFailure(e, `unsupported error: '${name}' - ${e} - ${win.navigator?.userAgent ?? 'unknown user-agent'}`, options)
            }
        }}
        return scope[name] = scoped[sym]
    }
    const buildDispatcher = (fn, client) => { // works for both functions and literals
        if (f(fn)) {
            return function(...args) {
                args.unshift(client)
                try {
                    fn.apply(null, args)
                } catch (e) {
                    client.log(`Client callback raised error: ${fn.name ?? fn} -> ${e}`)
                    throw e
                }
            }
        }
    }
    const buildLog = (type) => {
        const override = buildParams(win.location).params.get(qualify('log'))
        if (override != null) {
            switch (override) {
                case '':      type = true;     break
                case 'true':  type = true;     break
                case 'false': type = false;    break
                default:      type = override; break
            }
        }

        const log = (log, id) => {
            if (!log) return () => {}
            const logger = (args) => {
                if (def(args)) {
                    if (!(args instanceof Error)) {
                        console.log(args)
                    }
                    if (def(id)) {
                        const s = args.toString()
                        if (s == '[object Object]') return // ignore
                        if (id == 'alert') {
                            alert(s)
                        } else {
                            const dom = doc.getElementById(id)
                            if (def(dom)) {
                                dom.insertAdjacentHTML('afterbegin', `-- ${s}<br>`)
                            }
                        }
                    }
                }
            }
            if (override != null) {
                logger.override = override
            }
            return logger
        }

        switch (typeof type) {
            case 'boolean':  return log(type, 'softpay-log')
            case 'string':   return log(def(type), type)
            case 'function': return (args) => { fun(() => type(args)) }
            default:         return log(false)
        }
    }
    const buildParams = (url) => {
        if (def(url) && url !== false) { // false = ignore
            return require(() => {
                const params = { params: null, rel: true, query: null, hash: null }
                if (url = str(url)) {
                    if (/^\w+:\/\//.test(url)) {
                        params.rel = false
                    }
                    let q = url.indexOf('?'), // implies reload, takes precedence
                        h = url.indexOf('#')
                    if (h != -1 && q == -1) {
                        params.params = new URLSearchParams(url.substring(h + 1))
                    } else if (q == -1) {
                        if (params.rel) {
                            params.params = new URLSearchParams(url)
                            q = 0 // TODO: leave as -1?
                        } else {
                            params.params = new URLSearchParams()
                            q = null
                        }
                        h = null
                    } else {
                        params.params = new URLSearchParams(url.substring(q + 1, h != -1 ? h : url.length))
                        h = null
                    }
                    params.query = q == -1 ? null : q
                    params.hash  = h
                }
                return params
            })
        } else return null
    }
    const buildUrl = (options, request, type, action) => {
        const time = now(), opts = options[unqualify(type)]
        if (!def(opts)) return [null, null, time]

        const loc      = win.location,
              url      = str(fun(opts.url) ?? loc), // copy!
              params   = buildParams(url), // as-is params from 'url'!
              absolute = new URL(params.rel ? loc : url),
              Response = responseType(options)

        if (params.rel) {
            const i    = params.query ?? params.hash,
                  path = i > 0 ? url.substring(0, i) : null

            if (def(path)) {
                if (absolute.pathname.endsWith('/')) {
                    absolute.pathname += path.startsWith('/') ? path : `/${path}`
                } else if (path.startsWith('/')) {
                    absolute.pathname += path
                } else {
                    absolute.pathname += `/${path}`
                }
            }
        }

        for (const param in Response) {
            params.params.delete(Response[param])
        }
        if (def(request.token)) {
            params.params.set(Response.TOKEN, request.token)
        }
        if (def(action)) {
            params.params.set(Response.ACTION, action)
        }
        params.params.set(type, time) // cache-buster, already qualified

        if (options.log.override != null) {
            params.params.set(qualify('log'), options.log.override)
        }

        if (def(params.hash)) {
            absolute.hash   = str(params.params)
            absolute.search = ''
        } else {
            absolute.search = str(params.params)
            absolute.hash   = ''
        }

        return [win.encodeURIComponent(absolute), params, time]
    }
    const buildAction = (action) => {
        let actionIntent = action.replace(/([a-z])([A-Z])/g, (_, a, b) => { 
            return `${a}_${b}` 
        })
        return [
           action.toLowerCase().replace('_', ''),
           `io.softpay.action.${actionIntent.toUpperCase()}`
        ]
    }
    const id = (options) => {
        const env = options.env, appId = store.get(softpay.Response.APP_ID) ?? str(env.appId, env)
        return require(() => { let id = appId?.toUpperCase(); return def(id) ? /^[A-Z]{3}\d{10}$/.test(id) ? id : false : true }, `invalid app id: '${appId}'`, options) // optional
    }
    const buildIntent = (options, request, action) => {
        const env = options.env
        let [actionPath, actionIntent] = buildAction(action)
        let intent = `intent://${env.app}/${actionPath}?`
        for (const key in request) {
            const val = request[key]
            if (def(val) && !f(val)) {
                intent += `${key}=${win.encodeURIComponent(val)}&`
            }
        }
        intent = intent.slice(0, -1)

        const Response            = responseType(options),
              [callback, _, time] = buildUrl(options, request, Response.CALLBACK, action), // as-is
              [fallback]          = buildUrl(options, request, Response.FALLBACK, action), // as-is
              pending             = { controller: new AbortController(), processed: Processed.CREATED, state: 0, token: request.token, launch: null, timer: null, extras: {} }

        // Unknown as in no response actually received, e.g. no callback configured.
        pending.extras[Response.UNKNOWN]    = time
        pending.extras[Response.ACTION]     = action
        pending.extras[Response.REQUEST_ID] = request.requestId

        request._pending = pending

        const pkg   = env.pkg,
              appId = id(options),
              pwa   = env.pwa

        const p  = def(pkg)      ? `;package=${pkg}` : '',
              cb = def(callback) ? `;S.${Response.CALLBACK}=${callback}`    : '',
              fb = def(fallback) ? `;S.browser_fallback_url=${fallback}`    : '',
              i  = def(appId)    ? `;S.${softpay.Response.APP_ID}=${appId}` : '',
              a  = !!pwa         ? `;S.pwa=${pwa}` : '' // null|false: non PWA

        return [`${intent}#Intent${p};scheme=softpay;action=${actionIntent}${cb}${fb}${i}${a};S.version=${softpay.version.major}.${softpay.version.minor};end`, time, Response]
    }
    const buildProcessor = (options, request, action) => {
        request.toString = () => `Params${toString(request)}`

        const [intent, time, Response] = buildIntent(options, request, action)

        options.log(intent)

        // To work correctly, same tab must be supported; if not, rely on focus/blur only.
        const supportsHashChange = (hash) => {
            return def(hash) && has(win, 'chrome') && /chrome|chromium|crios/i.test(win.navigator.userAgent) 
        }        

        const hash   = options.callback?.hash ?? options.fallback?.hash,
              events = supportsHashChange(hash) ? ['hashchange', 'focus', 'blur'] : ['focus', 'blur']

        const processor = {
            process: () => {
                const pending   = request._pending,
                      requestId = request.requestId

                require(() => def(pending) && pending.processed == Processed.CREATED, `request already processed: ${processor}`, options, Failures.INVALID_USAGE)
                pending.processed = Processed.LAUNCHING

                if (def(requestId)) {
                    require(() => { const used = def(store.get(requestId)); if (used) pending.processed = Processed.FAILED; return !used }, () => `request id already used: '${requestId}' - ${processor}`, options, Failures.INVALID_ARGUMENT)
                }

                let time     = now(),
                    lastTime = time,
                    blurTime = null

                const complete = () => {
                    pending.controller.abort()
                    pending.timer?.abort()
                    if (pending.processed <= Processed.UNKNOWN) {
                        const [response, failure] = dispatchResponse(options, request),
                              r = def(response),
                              f = def(failure)

                        pending.processed = f ? Processed.FAILED : (r ? (has(response, Response.UNKNOWN) ? Processed.UNKNOWN : Processed.SUCCEEDED) : Processed.UNKNOWN)
                        if (!(r || f)) {
                            options.log(`Request done: ${processor}`)
                        }
                    }
                }

                on(win, events, { signal: pending.controller.signal }, (e) => {
                    const state = ++pending.state,
                          type  = e.type

                    lastTime = time
                    time     = now()

                    options.log(`Event '${type}': ${time} (${time - lastTime}ms) - ${processor}`)

                    switch (type) {
                        case 'hashchange': complete(); break
                        case 'focus': {
                            // Guard against rapid blur/focus/blur sequences observed empirically on certain devices.
                            if (events.length == 2) {
                                const diff  = time - (blurTime ?? time),
                                      delay = (state == 2 && diff < 250) ? options.focusDelay : 0
                                pending.timer = emit(complete, delay)
                            }
                            break
                        }
                        case 'blur': {
                            // No blur at all implies failure to launch.
                            if (blurTime == null) {
                                pending.launch.abort()
                                pending.processed = Processed.PROCESSING
                            }
                            pending.timer?.abort()
                            blurTime = time
                        }
                    }
                })

                pending.launch = emit(() => { time = now(); options.log(`Launch check after ${time - lastTime}ms: ${blurTime != null}`); if (blurTime == null) processor.abort(`failed to launch intent`) }, 2500) // very high delay intentional (Firefox often > 1s), and should not happen on Android devices

                win.location = intent

                return processor
            },
            abort: (message = null) => {
                const pending = request._pending
                if (def(pending)) {
                    // Processing at Softpay *cannot* be aborted, must be explicitly cancelled by POS app.
                    if (pending.processed <= Processed.LAUNCHING) {
                        pending.processed = Processed.ABORTED
                        pending.controller.abort()
                        pending.timer?.abort()
                        dispatchResponse(options, request, buildFailure(Failures.ABORTED_BY_CLIENT, 'client abort' + (def(message) ? `: ${str(message)}` : ''), action))
                        return true
                    }
                }
                return false
            },
            action: action,
            intent: intent,
            token:  def(request.token) ? request.token : time,
            toString: () => `Request[${action}; ${Processed.name(request._pending?.processed)}; Params${toString(request)}]`
        }
        return processor
    }
    const buildRequest = (options, url) => {
        url = require(str(url), `invalid url: '${url}'`, options)
        const protocol = 'https://', app = options.env.app // for correct url parsing
        if (url.startsWith('//')) {
            url = `${protocol}${url}`
        } else if (url.startsWith('/')) {
            url = `${protocol}${app}${url}`
        } else {
            url = url.replace(/^\w+:\/\//, protocol)
        }
        url = require(() => new URL(url), `malformed url: '${url}'`, options)

        require(() => url.host ?? url.hostname == app, `invalid host: '${url}'`, options)
        require(() => url.pathname.length >= 6 && url.pathname.length <= 8, `invalid path: '${url}'`, options) // +1 for /
        return [url.pathname.substring(1), url.searchParams]
    }
    const responseType = (options) => options.Response ?? softpay.Response
    const parseResponse = (options, pending, url = null) => {
        const params   = buildParams(url ?? win.location),
              extras   = pending?.extras,
              Response = softpay.Response, // want unqualified keys in response always
              response = {}

        let empty = true
        for (const [k, v] of params.params) {
            if (def(key(k, responseType(options)))) {
                response[unqualify(k)] = def(v) ? v : null
                empty = false
            }
        }
        if (def(extras)) {
            for (const k in extras) {
                const v = extras[k]
                if (def(v)) {
                    const uk = unqualify(k)
                    if (!def(response[uk])) {
                        response[uk] = v
                    }
                }
            }
        }
        // Already unqualified here.
        if (def(response[Response.CALLBACK]) || def(response[Response.FALLBACK])) {
            if (def(response[Response.UNKNOWN])) {
                delete response[Response.UNKNOWN]
            }
        }
        response.toString = () => `Response${toString(response)}`
        return [response, empty]
    }
    const buildResponse = (options, pending = null, err = null, url = null) => {
        const [response, empty] = parseResponse(options, pending, url)

        const Response = softpay.Response,
              fallback = response[Response.FALLBACK],
              action   = response[Response.ACTION]

        if (!empty) {
            const params = (def(fallback) ? options.fallback : options.callback)?.params // as-is
            if (def(params)) {
                for (const [k, v] of params) {
                    if (!def(response[k])) {
                        response[k] = v
                    }
                }
            }
        }
        const unknown   = response[Response.UNKNOWN],
              callback  = response[Response.CALLBACK],
              token     = response[Response.TOKEN],
              requestId = response[Response.REQUEST_ID],
              appId     = response[Response.APP_ID],
              time      = fallback ?? callback ?? unknown

        if (!def(time) || store.get(`seen_${time}`, (type) => {
            return !def(type) || type == Response.UNKNOWN ? { set: fallback ? Response.FALLBACK : callback ? Response.CALLBACK : Response.UNKNOWN, get: null } : type
        }, 14400)) {  // ~4 hours
            // Not a response, or already seen, but can be client abort failure still.
            return [null, err]
        }

        if (def(appId)) {
            store.set(Response.APP_ID, appId)
        }
        if (def(requestId)) {
            store.set(requestId, time, 14400)
        }
        if (!def(token)) {
            response[Response.TOKEN] = def(pending?.token) ? pending.token : time
        }

        let failure = def(fallback) ? buildFailure(Failures.SOFTPAY_NO_APP, `cannot find ${options.env.pkg ?? 'any'} Softpay app on the device`, action) : err

        if (!def(failure) && def(callback) && response[Response.REQUEST_STATE] != 'SUCCEEDED') {
            failure = buildFailure(Failures.REQUEST_FAILED, response[Response.CODE], action)
        }
        return [response, failure]
    }
    const launchResponse = (options) => {
        const [response] = dispatchResponse(options)  // non PWA
        has(win, 'launchQueue', (launchQueue) => {    // PWA, will not be dispatched twice
            launchQueue.setConsumer(launchParams => {
                if (options.env.pwa && def(launchParams.targetURL)) {
                    dispatchResponse(options, null, null, new URL(launchParams.targetURL))
                }
            })
        })
        return response
    }
    const buildEnv = (options, env) => {
        if (typeof env != 'object') {
            env = { app: str(env) }
        }
        let app    = str(env.app),
            pkg    = str(env.pkg),
            usePkg = def(pkg),
            e      = str(env?.env)?.toLowerCase() ?? null

        const path = (a) => {
            if (!def(a)) return null
            const arr = require(() => { let arr = a.split('.'); return arr.length >= 2 ? arr : false }, `invalid: '${a}'`, options)
            return arr.map((val) => require(() => { return val.length >= 2 ? val.toLowerCase() : false }, `invalid: '${a}' -> '${val}'`, options))
        }

        app = path(app) ?? ['softpay', 'io'] // intent filter
        pkg = path(pkg) ?? arr(app, true) // specific package, true = reverse

        if (def(e)) {
            if (e != pkg[pkg.length - 1]) pkg.push(e)
            if (e == app[0]) app.shift()
            usePkg = true
        }

        let dms = env.pwa,
            pwa = null
        if (dms === true) {
            dms = null
            pwa = 'forced'
        } else if (dms === false) {
            dms = [] // never
        } else {
            dms = arr(dms) // can default
        }

        const environment = {
            env:   e,
            app:   app.join('.'),
            pkg:   usePkg ? pkg.join('.') : null,
            pwa:   pwa, // null|false: no, non-null string: PWA mode
            appId: store.get(softpay.Response.APP_ID) ?? env.appId, // validated a request time, can be a function

            toString: function() { return `Env[${this.pkg}]` }
        }

        emit(() => {
            let pwa = environment.pwa
            if (pwa == null) {
                const modes = dms ?? ['fullscreen', 'standalone', 'minimal-ui']
                pwa = modes.length == 0 ? null : false
                for (mode of modes) {
                    if (win.matchMedia(`(display-mode: ${mode})`).matches) {
                        pwa = mode
                        break
                    }
                }
            }
            if (environment.pwa = pwa) {
                if (!store.get(`pwa_${client.id}`, (o) => def(o))) {
                    options.log(`PWA mode detected: '${pwa}' -> ${toString(environment)}`)
                }
            }
            options.env = lock(environment)
        })
        options.env = environment
        return options
    }
    const buildClient = (options) => {
        let t = 0, 
            auto = () => store.get(softpay.Response.TOKEN, (token) => def(token) ? ++token : ++t),
            tokenFor = (token) => token == 'auto' ? auto() : str(token),
            env = options.env

        const environment = () => {
            return lock({ 
                appId: id(options),
                env:   env.env,
                app:   env.app,
                pkg:   env.pkg,
                pwa:   env.pwa,
                id:    client.id,
                toString: function() { return `Env${toString(this)}` }
            })
        },
        client = {
            log:      options.log,
            env:      environment,
            toString: function() { return `Client[${softpay}; ${this.id}; ${toString(options)}]` }
        },
        method = (action) => {
            let fn = client[action]
            if (def(fn)) return fn
            for (const name in client) {
                fn = client[name]
                if (f(fn) && fn.name.toLowerCase() == `[${action}]`) return fn
            }
            return null
        }, 
        buildFn = (fn) => buildFunction(fn, client, options)
        
        buildFn(function pending(requestId, switchBackTimeout, token = 'auto') {
            const request = {
                requestId:         require(() => { let r = str(requestId); return def(r) && /^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i.test(r) ? r : false }, `invalid request id: '${requestId}'`, options),
                switchBackTimeout: num(switchBackTimeout),
                token:             tokenFor(token)
            }
            return buildProcessor(options, request, this.name)
        })

        buildFn(function payment(amount, currency, posReferenceNumber, email, locale, switchBackTimeout, token = 'auto') {
            const request = {
                amount:             require(() => { let a = num(amount); return def(a) && a >= 0 ? a : false }, `invalid amount: '${amount}'`, options),
                currency:           require(() => { let c = str(currency); return def(c) ? /^[a-z]{3}$|^\d{3}$/i.test(c) ? c : false : true }, `invalid currency: '${currency}'`, options), // e.g. 208 or DKK
                posReferenceNumber: require(() => { let prn = str(posReferenceNumber); return def(prn) ? /^[a-z0-9]{1,32}$/i.test(prn) ? prn : false : true }, `invalid pos reference number: '${posReferenceNumber}'`, options),
                receipt:            require(() => { let e = str(email); return def(e) ? /[^@]@[^@.]+\.[^@.]+$/.test(e) ? e : false : true }, `invalid receipt email: '${email}'`, options),
                locale:             str(locale),
                switchBackTimeout:  num(switchBackTimeout),
                token:              tokenFor(token)
            }
            return buildProcessor(options, request, this.name)
        })

        buildFn(function appId(token = 'auto') {
            require(() => def(options.callback), `callback required for '${this.name}'`, options, Failures.INVALID_USAGE)
            const request = {
                token: tokenFor(token)
            }
            return buildProcessor(options, request, this.name)
        })

        buildFn(function processPending(requestId, switchBackTimeout, token = 'auto') {
            return client.pending(requestId, switchBackTimeout, token).process()
        })

        buildFn(function processPayment(amount, currency, posReferenceNumber, email, locale, switchBackTimeout, token = 'auto') {
            return client.payment(amount, currency, posReferenceNumber, email, locale, switchBackTimeout, token).process()
        })

        buildFn(function processAppId(token = 'auto') {
            return client.appId(token).process()
        })

        buildFn(function requestFor(url) {
            const [action, request] = buildRequest(options, url),
                  fn = require(() => { let fn = method(action); return f(fn) && fn.name != '[process]' ? { fn: fn } : false }, `invalid action: '${action}'`, options).fn
            return fn(request)
        })

        buildFn(function process(url) {
            return client.requestFor(url).process()
        })

        options.onSuccess  = buildDispatcher(options.onSuccess,  client, 3)
        options.onFailure  = buildDispatcher(options.onFailure,  client)
        options.onResponse = buildDispatcher(options.onResponse, client)

        const response = launchResponse(options)

        // Assign id, which will be reused if a response is available.
        client.id = store.get('id', (id) => def(id) ? (def(response) ? id : ++id) : 1)
        
        if (!store.get(`init_${client.id}`, (init) => def(init))) {
            options.log(`Created Softpay client: ${client} -> ${toString(response ?? 'no response')}`)
        }

        return lock(client)
    }

    const softpay = {
        version:  { major: 1, minor: 2, toString: function() { return `${toString(this)}` } },
        Response: buildResponseType(),
        Failures: lock(Failures),
        toString: function() { return `Softpay${this.version}` }
    }

    buildFunction(function newClient(env = 'softpay.io', onSuccess, onFailure, onResponse, callback, fallback, namespaced = false, log = false, focusDelay = 750) {
        let call = buildParams(callback ??= `${win.location.origin}${win.location.pathname}`), // Softpay semantics, use false to exclude, undefined/void to default
            fall = buildParams(fallback) // Browser semantics (if no app to link to), use false to exclude (may default)
        if (def(call)) {
            call.url = callback
        } else if (onResponse !== null && !f(onResponse)) {
            onResponse = (client, response, failure, params) => client.log(`Response callback: ${response} -> (${failure ?? 'no failure available'}, ${params ?? 'no params available'})`)
        }

        if (def(fall)) {
            fall.url = fallback
        } else if (fallback !== null) { // default to callback url unless null = browser default
            fall = call
        }

        const options = {
            callback:   call,
            fallback:   fall,
            focusDelay: Math.abs(num(focusDelay) ?? 750),
            log:        buildLog(log),
        }

        if (f(onSuccess))  options.onSuccess  = onSuccess
        if (f(onFailure))  options.onFailure  = onFailure
        if (f(onResponse)) options.onResponse = onResponse

        if (namespaced == true && (def(call) || def(fall))) {
            options.Response = buildResponseType(true)
        }
        return buildClient(buildEnv(options, env))
    }, softpay, { log: buildLog('alert') }) // in lack of a better alternative here

    on(win, 'load', { once: true }, () => {
        loaded = true
        const queued = [...events]
        events = null
        for (const fn of queued) {
            try { fn() } catch (e) { }
        }
    })

    return lock(softpay)

}()
