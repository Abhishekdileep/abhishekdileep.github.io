# The lab: how services get onto the site

The site itself is static (GitHub Pages). Each lab service runs on my machine
and is exposed with Tailscale Funnel. The site only links to it and checks
whether it is reachable.

## Add a service

1. Run the app locally on a port, e.g. `localhost:8001`.

2. Expose it with Funnel. Funnel allows three public ports: 443, 8443, 10000.

   ```
   tailscale funnel --bg --https=8443 localhost:8001
   tailscale funnel status
   ```

   Port 443 is already used by the PDE solver. A second option is a path on the
   same port (`--set-path=/llama`), but the app then has to work under a
   sub-path, which many web UIs do not without extra configuration.

   To turn one off, repeat the command with `off` at the end.

3. Copy one of the files in `_lab/`, rename it, and fill in the front matter:

   | field         | meaning                                                        |
   |---------------|----------------------------------------------------------------|
   | `title`       | full name, shown on the card and the detail page                |
   | `short`       | short name for the list on the home page                        |
   | `order`       | position on the lab page (1 = first)                            |
   | `status`      | `live` or `planned`. Only `live` services are probed.           |
   | `service_url` | the public Funnel address, with `https://`                      |
   | `summary`     | one sentence for the card                                       |
   | `stack`       | list of models / datasets / tools                               |
   | `repo`        | code link, or `""`                                              |
   | `preview`     | `burgers` or `none`                                             |
   | `embed`       | `true` shows the live app in a frame on the detail page         |

   The text below the front matter is the write-up on the detail page.

4. Commit and push.

## How the status badge works

`assets/js/probe.js` sends one request from the visitor's browser to
`service_url` and reports "reachable" with the round-trip time, or "offline"
after 7 seconds. It cannot read the response (the browser hides it across
sites), so it shows that something answered at that address, not that the
model is healthy.

## If a page on this site should call a service directly

For anything beyond a link (say a form here that posts audio to the model),
the service must send this header, or the browser blocks the response:

```
Access-Control-Allow-Origin: https://abhishekdileep.github.io
```

`embed: true` needs the app to allow being framed (no `X-Frame-Options: DENY`).
