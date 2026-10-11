#!/bin/sh
# Tạo password file từ env mỗi lần start, rồi chạy broker.
# File nằm trong container (không commit mật khẩu, không cần mount ghi).
# ACL mount read-only từ host nên copy ra bản riêng: Mosquitto 2 đòi file
# thuộc user mosquitto và không cho người khác đọc.
set -eu
: "${MQTT_GATEWAY_PASSWORD:?Thiếu MQTT_GATEWAY_PASSWORD}"

PASSWD=/mosquitto/passwd
rm -f "$PASSWD"
mosquitto_passwd -c -b "$PASSWD" gateway "$MQTT_GATEWAY_PASSWORD"
chown mosquitto:mosquitto "$PASSWD"
chmod 0700 "$PASSWD"

install -o mosquitto -g mosquitto -m 0700 /mosquitto/config/acl.conf /mosquitto/acl
chown -R mosquitto:mosquitto /mosquitto/data

exec mosquitto -c /mosquitto/config/mosquitto.conf
