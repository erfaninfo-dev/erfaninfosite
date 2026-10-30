/**
 * Passenger entry point.
 *
 * cPanel's "Setup Node.js App" runs this file and sets PORT. It starts Next's
 * own server rather than wrapping it in a custom request handler, so routing,
 * streaming, caching and static file serving all behave exactly as they do
 * locally — there is no hand-written middleware here to drift from Next's.
 */
const next = require('next');

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

const app = next({ dev: false, hostname, port });

app
  .prepare()
  .then(() => {
    const { createServer } = require('node:http');
    const handle = app.getRequestHandler();

    createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error(
          JSON.stringify({ level: 'error', source: 'server', message: String(error) })
        );
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
    }).listen(port, hostname, () => {
      console.log(`Erfan Academy Web listening on ${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start Next.js:', error);
    process.exit(1);
  });
