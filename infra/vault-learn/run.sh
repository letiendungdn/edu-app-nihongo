#!/usr/bin/env bash
# Lab Vault: quản lý bí mật tập trung + mật khẩu DB TẠO ĐỘNG. Chạy riêng, không đụng DB/stack của app.
#   bash infra/vault-learn/run.sh up      # dựng Vault (dev) + Postgres riêng của lab
#   bash infra/vault-learn/run.sh demo    # KV secret, xin mật khẩu DB động, dùng, thu hồi
#   bash infra/vault-learn/run.sh down    # xóa sạch lab
# Xem docs/learn-devsecops.md mục 10 và docs/adr/0008-secrets-management.md.
set -euo pipefail

NET=vault-lab
VAULT_IMG=hashicorp/vault:1.20.4
PG_IMG=postgres:16-alpine
# Chế độ dev: token gốc cố định, dữ liệu trong RAM, KHÔNG dùng cho production.
ROOT_TOKEN=lab-root-token

vault() {
  docker run --rm --network "$NET" -e SKIP_SETCAP=1 -e VAULT_ADDR=http://vault-lab:8200 -e VAULT_TOKEN="${VAULT_TOKEN:-$ROOT_TOKEN}" \
    "$VAULT_IMG" vault "$@"
}
psql_as() { # psql_as <user> <password> <sql>
  docker run --rm --network "$NET" -e PGPASSWORD="$2" "$PG_IMG" \
    psql -h vault-lab-pg -U "$1" -d app -tAc "$3"
}

up() {
  docker network inspect "$NET" >/dev/null 2>&1 || docker network create "$NET" >/dev/null
  docker run -d --name vault-lab --network "$NET" --cap-add IPC_LOCK \
    -e VAULT_DEV_ROOT_TOKEN_ID="$ROOT_TOKEN" -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
    -p 127.0.0.1:8200:8200 "$VAULT_IMG" >/dev/null
  docker run -d --name vault-lab-pg --network "$NET" \
    -e POSTGRES_USER=vaultadmin -e POSTGRES_PASSWORD=vaultadmin-lab -e POSTGRES_DB=app "$PG_IMG" >/dev/null
  echo "Chờ Vault và Postgres…"
  for _ in $(seq 1 30); do
    vault status >/dev/null 2>&1 && psql_as vaultadmin vaultadmin-lab 'select 1' >/dev/null 2>&1 && break
    sleep 2
  done
  psql_as vaultadmin vaultadmin-lab 'create table if not exists notes(id serial primary key, body text)' >/dev/null
  echo "Vault: http://127.0.0.1:8200 (token: $ROOT_TOKEN)"
}

demo() {
  echo "== 1. KV: lưu bí mật tĩnh có phiên bản (thay cho .env)"
  vault kv put -mount=secret edu-app/jwt JWT_SECRET=lab-jwt-v1 >/dev/null
  vault kv put -mount=secret edu-app/jwt JWT_SECRET=lab-jwt-v2 >/dev/null
  echo "   bản mới nhất: $(vault kv get -mount=secret -field=JWT_SECRET edu-app/jwt)"
  echo "   bản cũ (v1):  $(vault kv get -mount=secret -version=1 -field=JWT_SECRET edu-app/jwt)"

  echo "== 2. Policy: app chỉ được ĐỌC đúng đường dẫn của nó"
  printf '%s\n' \
    'path "secret/data/edu-app/*" { capabilities = ["read"] }' \
    'path "database/creds/app-rw" { capabilities = ["read"] }' |
    docker run --rm -i --network "$NET" -e SKIP_SETCAP=1 -e VAULT_ADDR=http://vault-lab:8200 -e VAULT_TOKEN="$ROOT_TOKEN" \
      "$VAULT_IMG" vault policy write edu-app - >/dev/null
  APP_TOKEN=$(vault token create -policy=edu-app -ttl=15m -field=token)
  echo "   token của app đọc được JWT: $(VAULT_TOKEN=$APP_TOKEN vault kv get -mount=secret -field=JWT_SECRET edu-app/jwt)"
  if VAULT_TOKEN=$APP_TOKEN vault kv put -mount=secret edu-app/jwt JWT_SECRET=hack >/dev/null 2>&1; then
    echo "   ✗ SAI: app ghi được"; else echo "   ✓ app thử GHI → bị từ chối (403)"; fi

  echo "== 3. Mật khẩu DB động: mỗi lần xin là một user mới, tự hết hạn sau 2 phút"
  vault secrets enable database >/dev/null 2>&1 || true
  vault write database/config/app plugin_name=postgresql-database-plugin allowed_roles=app-rw \
    connection_url='postgresql://{{username}}:{{password}}@vault-lab-pg:5432/app?sslmode=disable' \
    username=vaultadmin password=vaultadmin-lab >/dev/null
  vault write database/roles/app-rw db_name=app default_ttl=2m max_ttl=10m \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT ON notes TO \"{{name}}\"; GRANT USAGE ON SEQUENCE notes_id_seq TO \"{{name}}\";" >/dev/null
  CREDS=$(VAULT_TOKEN=$APP_TOKEN vault read -format=json database/creds/app-rw)
  DB_USER=$(printf '%s' "$CREDS" | sed -n 's/.*"username": "\([^"]*\)".*/\1/p')
  DB_PASS=$(printf '%s' "$CREDS" | sed -n 's/.*"password": "\([^"]*\)".*/\1/p')
  LEASE=$(printf '%s' "$CREDS" | sed -n 's/.*"lease_id": "\([^"]*\)".*/\1/p')
  echo "   Vault cấp user: $DB_USER (lease $LEASE)"
  psql_as "$DB_USER" "$DB_PASS" "insert into notes(body) values ('ghi bằng user động')" >/dev/null
  echo "   ✓ đăng nhập và ghi được: $(psql_as "$DB_USER" "$DB_PASS" 'select count(*) from notes') dòng"

  echo "== 4. Lộ mật khẩu? Thu hồi ngay, không cần đổi mật khẩu cho cả hệ thống"
  vault lease revoke "$LEASE" >/dev/null
  if psql_as "$DB_USER" "$DB_PASS" 'select 1' >/dev/null 2>&1; then
    echo "   ✗ SAI: user vẫn đăng nhập được"; else echo "   ✓ user $DB_USER đã bị xóa, đăng nhập thất bại"; fi
}

down() {
  docker rm -f vault-lab vault-lab-pg >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  echo "Đã xóa lab Vault."
}

case "${1:-}" in
  up) up ;;
  demo) demo ;;
  down) down ;;
  *) echo "Dùng: $0 up|demo|down" >&2; exit 1 ;;
esac
