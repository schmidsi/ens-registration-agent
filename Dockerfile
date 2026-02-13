FROM denoland/deno:2.6.8

WORKDIR /app

COPY deno.json deno.lock ./
RUN deno install

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD deno eval "const r = await fetch('http://localhost:3000/api/health'); if (!r.ok) Deno.exit(1);"

CMD ["deno", "task", "http"]
