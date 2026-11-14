# PocketBase für die Club-App, nach dem Beispiel aus "Going to production"
# (https://pocketbase.io/docs/going-to-production/). Es gibt kein offizielles
# Image. Schema (pb_migrations) und Fachregeln (pb_hooks, ADR 0002) reisen im
# Image mit, damit Version und Schema immer zusammen einen Tag bilden.
#
# Update: Version und Prüfsumme aus dem Release-Feed übernehmen
# (https://ganigeorgiev.com/meta/pocketbase/pocketbase/releases.atom?channel=default,
# Datei checksums.txt im selben Download-Pfad). Vorher Changelog lesen und
# lokal mit einer Kopie des letzten Backups testen.

FROM alpine:3.22

ARG PB_VERSION=0.42.2
ARG PB_SHA256=a04d3a071c274b57c6592a65d1d03466ee11adf141ebb50bfcf9d986ead2026a

RUN apk add --no-cache unzip ca-certificates wget

# Seit v0.41 kommen Releases nur noch von ganigeorgiev.com, nicht von GitHub.
RUN wget -q -O /tmp/pb.zip \
      "https://ganigeorgiev.com/meta/pocketbase/pocketbase/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && echo "${PB_SHA256}  /tmp/pb.zip" | sha256sum -c - \
    && unzip /tmp/pb.zip pocketbase -d /pb/ \
    && rm /tmp/pb.zip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090

# Einstellungen (SMTP, S3) liegen verschlüsselt in der Datenbank. Der Schlüssel
# kommt als Laufzeit-Variable PB_ENCRYPTION_KEY aus Dokploy, 32 Zeichen.
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", \
     "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks", \
     "--encryptionEnv=PB_ENCRYPTION_KEY"]
