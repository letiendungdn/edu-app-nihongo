#!/usr/bin/env bash
# Học serverless: S3 + Lambda + IAM bằng Terraform, trên LocalStack (miễn phí) hoặc AWS thật.
#
#   bash infra/aws-learn/run.sh up        # bật LocalStack (docker compose profile aws-learn)
#   bash infra/aws-learn/run.sh apply     # tạo bucket, IAM role, Lambda, trigger bằng Terraform
#   bash infra/aws-learn/run.sh plan      # xem Terraform sẽ đổi gì (thêm -var key=value để thử)
#   bash infra/aws-learn/run.sh demo      # tải một ảnh lên uploads/, chờ Lambda tạo thumbnails/
#   bash infra/aws-learn/run.sh destroy   # xóa sạch mọi tài nguyên đã tạo
#   bash infra/aws-learn/run.sh down      # tắt LocalStack
#
# Đích AWS thật (TỐN TIỀN nếu vượt mức miễn phí, cần profile edu-app có quyền S3/Lambda/IAM):
#   TARGET=aws bash infra/aws-learn/run.sh apply
#
# Terraform chạy trong container hashicorp/terraform, không cần cài trên máy. Xem docs/learn-aws-serverless.md.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
TARGET="${TARGET:-localstack}"
TF_IMAGE="hashicorp/terraform:1.12.2"
LOCAL_ENDPOINT="http://localhost:4566"

# Dùng LocalStack nào đang giữ cổng 4566 (của project: edu-localstack, hoặc một LocalStack bạn tự bật ở chỗ khác).
# Terraform chạy trong container nên phải vào CÙNG mạng Docker và gọi LocalStack bằng tên container.
LS_CONTAINER="$(docker ps --filter publish=4566 --format '{{.Names}}' | head -1)"
if [ -n "$LS_CONTAINER" ]; then
  NETWORK="${NETWORK:-$(docker inspect "$LS_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')}"
  LS_URL="http://$LS_CONTAINER:4566"
else
  NETWORK="${NETWORK:-edu-app_default}"
  LS_URL="http://localstack:4566"
fi

tf() {
  local extra=()
  if [ "$TARGET" = "aws" ]; then
    extra+=(-it -v "$HOME/.aws:/root/.aws:ro")
  fi
  # ${extra[@]+...}: bash 3.2 của macOS coi mảng rỗng là "unbound variable" khi bật set -u.
  docker run --rm ${extra[@]+"${extra[@]}"} --network "$NETWORK" \
    -v "$DIR:/work" -w /work/terraform \
    -e TF_VAR_target="$TARGET" -e TF_VAR_localstack_url="$LS_URL" -e TF_IN_AUTOMATION=1 \
    "$TF_IMAGE" "$@"
}

# State riêng cho từng đích (workspace localstack / aws): xóa LocalStack không làm lệch state của AWS thật.
tf_ready() {
  tf init -input=false >/dev/null
  tf workspace select -or-create "$TARGET" >/dev/null
}

awsl() {
  if [ "$TARGET" = "aws" ]; then
    aws --profile "${AWS_PROFILE_NAME:-edu-app}" "$@"
  else
    AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=ap-southeast-1 \
      aws --endpoint-url "$LOCAL_ENDPOINT" "$@"
  fi
}

lambda_deps() {
  if [ ! -d "$DIR/lambda/thumbnail/node_modules/jimp" ]; then
    (cd "$DIR/lambda/thumbnail" && npm install --omit=dev --no-audit --no-fund >/dev/null)
  fi
}

case "${1:-}" in
  up)
    if [ -n "$LS_CONTAINER" ]; then
      echo "Đã có LocalStack đang chạy: container $LS_CONTAINER (mạng $NETWORK). Dùng luôn, không bật thêm."
      exit 0
    fi
    docker compose -f "$ROOT/docker-compose.yml" --profile aws-learn up -d localstack
    for _ in $(seq 1 60); do
      curl -sf "$LOCAL_ENDPOINT/_localstack/health" >/dev/null && { echo "LocalStack sẵn sàng: $LOCAL_ENDPOINT"; exit 0; }
      sleep 2
    done
    echo "LocalStack chưa lên, xem: docker logs edu-localstack" >&2
    exit 1
    ;;
  apply)
    lambda_deps
    tf_ready
    if [ "$TARGET" = "aws" ]; then
      echo "⚠️  Tạo tài nguyên THẬT trên AWS. Đọc kỹ plan rồi gõ yes để đồng ý."
      tf apply
    else
      tf apply -auto-approve -input=false
    fi
    ;;
  plan)
    lambda_deps
    tf_ready
    shift
    tf plan -input=false "$@"
    ;;
  demo)
    BUCKET="$(tf output -raw bucket 2>/dev/null || true)"
    [ -n "$BUCKET" ] || { tf_ready; BUCKET="$(tf output -raw bucket)"; }
    IMG="$(mktemp -t edu-demo).png"
    (cd "$DIR/lambda/thumbnail" && node -e "
      import('jimp').then(async ({ Jimp }) => {
        const img = new Jimp({ width: 1280, height: 960, color: 0x3b82f6ff });
        await img.write(process.argv[1]);
      });" "$IMG")
    KEY="uploads/demo/anh-thu-$(date +%s).png"
    awsl s3 cp "$IMG" "s3://$BUCKET/$KEY" >/dev/null
    rm -f "$IMG"
    echo "Đã tải s3://$BUCKET/$KEY (1280x960). Chờ Lambda tạo ảnh thu nhỏ…"
    THUMB="thumbnails/${KEY#uploads/}"
    THUMB="${THUMB%.png}.jpg"
    for i in $(seq 1 60); do
      if awsl s3api head-object --bucket "$BUCKET" --key "$THUMB" >/dev/null 2>&1; then
        awsl s3api head-object --bucket "$BUCKET" --key "$THUMB" --query '{key:`'"$THUMB"'`,bytes:ContentLength,type:ContentType}'
        echo "✓ Lambda đã tạo ảnh thu nhỏ sau khoảng $((i * 2)) giây"
        exit 0
      fi
      sleep 2
    done
    echo "✗ Chưa thấy ảnh thu nhỏ sau 120 giây. Xem log: docker logs edu-localstack | grep -i lambda" >&2
    exit 1
    ;;
  destroy)
    tf_ready
    if [ "$TARGET" = "aws" ]; then tf destroy; else tf destroy -auto-approve -input=false; fi
    ;;
  down)
    docker compose -f "$ROOT/docker-compose.yml" --profile aws-learn stop localstack
    ;;
  *)
    sed -n '2,13p' "$0"
    exit 1
    ;;
esac
