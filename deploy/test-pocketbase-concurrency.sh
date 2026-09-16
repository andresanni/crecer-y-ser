set -eu

test_dir="$(mktemp -d /root/cys-concurrency-test.XXXXXX)"
test_pid=""
sse_pid=""

cleanup() {
  if test -n "$test_pid"; then
    kill "$test_pid" 2>/dev/null || true
    wait "$test_pid" 2>/dev/null || true
  fi
  if test -n "$sse_pid"; then
    kill "$sse_pid" 2>/dev/null || true
    wait "$sse_pid" 2>/dev/null || true
  fi
  case "$test_dir" in
    /root/cys-concurrency-test.*) rm -rf "$test_dir" ;;
    *) exit 2 ;;
  esac
}

trap cleanup EXIT
install -d -m 0700 "$test_dir/pb_data" "$test_dir/pb_migrations"
cp -a /root/pb/pb_data/. "$test_dir/pb_data/"
printf 'stage=copy_ready\n'

test_email="concurrency-test@local.invalid"
test_password="ConcurrencyOnly-2026"
/root/pb/pocketbase admin create "$test_email" "$test_password" --dir="$test_dir/pb_data" >/dev/null
printf 'stage=admin_ready\n'

/root/pb/pocketbase serve \
  --http=127.0.0.1:18091 \
  --dir="$test_dir/pb_data" \
  --hooksDir=/root/pb/pb_hooks \
  --migrationsDir="$test_dir/pb_migrations" \
  --automigrate=false \
  --hooksWatch=false \
  >"$test_dir/pocketbase.log" 2>&1 &
test_pid="$!"

attempt=0
until curl -fsS http://127.0.0.1:18091/api/health >/dev/null; do
  attempt=$((attempt + 1))
  if test "$attempt" -ge 30 || ! kill -0 "$test_pid" 2>/dev/null; then
    cat "$test_dir/pocketbase.log"
    exit 1
  fi
  sleep 1
done
printf 'stage=server_ready\n'

admin_auth="$(curl -fsS http://127.0.0.1:18091/api/admins/auth-with-password \
  -H 'Content-Type: application/json' \
  --data-binary "{\"identity\":\"$test_email\",\"password\":\"$test_password\"}")"
admin_token="$(printf '%s' "$admin_auth" | jq -er '.token')"
printf 'stage=admin_authenticated\n'

enrollments="$(curl -fsS --get http://127.0.0.1:18091/api/collections/inscripciones/records \
  -H "Authorization: $admin_token" \
  --data-urlencode 'filter=estado != "Baja"' \
  --data-urlencode 'perPage=1')"
test "$(printf '%s' "$enrollments" | jq -er '.items | length')" -gt 0 || {
  printf 'error=no_active_enrollment\n'
  exit 1
}
enrollment="$(printf '%s' "$enrollments" | jq -er '.items[0]')"
enrollment_id="$(printf '%s' "$enrollment" | jq -er '.id')"
course_id="$(printf '%s' "$enrollment" | jq -er '.curso_id')"
cycle_id="$(printf '%s' "$enrollment" | jq -er '.ciclo_id')"
printf 'stage=enrollment_ready\n'

periods="$(curl -fsS --get http://127.0.0.1:18091/api/collections/periodos/records \
  -H "Authorization: $admin_token" \
  --data-urlencode "filter=ciclo_id = \"$cycle_id\"" \
  --data-urlencode 'perPage=1')"
test "$(printf '%s' "$periods" | jq -er '.items | length')" -gt 0 || {
  printf 'error=no_period_for_cycle\n'
  exit 1
}
period_id="$(printf '%s' "$periods" | jq -er '.items[0].id')"

workflow_response="$(curl -fsS --get http://127.0.0.1:18091/api/collections/instancias_carga_boletin/records \
  -H "Authorization: $admin_token" \
  --data-urlencode "filter=curso_id = \"$course_id\" && periodo_id = \"$period_id\"" \
  --data-urlencode 'perPage=1')"
if test "$(printf '%s' "$workflow_response" | jq -er '.items | length')" -gt 0; then
  workflow="$(printf '%s' "$workflow_response" | jq -er '.items[0]')"
  workflow_id="$(printf '%s' "$workflow" | jq -er '.id')"
  workflow="$(curl -fsS "http://127.0.0.1:18091/api/collections/instancias_carga_boletin/records/$workflow_id" \
    -X PATCH \
    -H "Authorization: $admin_token" \
    -H 'Content-Type: application/json' \
    --data-binary '{"estado":"CONTROL_DIRECTIVO"}')"
else
  workflow_body="$(jq -nc \
    --arg courseId "$course_id" \
    --arg periodId "$period_id" \
    '{curso_id:$courseId,periodo_id:$periodId,estado:"CONTROL_DIRECTIVO",revision:17}')"
  workflow="$(curl -fsS http://127.0.0.1:18091/api/collections/instancias_carga_boletin/records \
    -H "Authorization: $admin_token" \
    -H 'Content-Type: application/json' \
    --data-binary "$workflow_body")"
fi
workflow_id="$(printf '%s' "$workflow" | jq -er '.id')"
initial_revision="$(printf '%s' "$workflow" | jq -er '.revision')"
printf 'stage=workflow_ready revision=%s\n' "$initial_revision"

user_body="$(jq -nc \
  --arg email "$test_email" \
  --arg password "$test_password" \
  '{email:$email,password:$password,passwordConfirm:$password,name:"Concurrency Test"}')"
curl -fsS http://127.0.0.1:18091/api/collections/users/records \
  -H "Authorization: $admin_token" \
  -H 'Content-Type: application/json' \
  --data-binary "$user_body" >/dev/null
printf 'stage=user_ready\n'

user_auth="$(curl -fsS http://127.0.0.1:18091/api/collections/users/auth-with-password \
  -H 'Content-Type: application/json' \
  --data-binary "{\"identity\":\"$test_email\",\"password\":\"$test_password\"}")"
user_token="$(printf '%s' "$user_auth" | jq -er '.token')"
printf 'stage=user_authenticated\n'

curl -sN http://127.0.0.1:18091/api/realtime \
  -H "Authorization: $user_token" \
  >"$test_dir/realtime.events" &
sse_pid="$!"
attempt=0
client_id=""
until test -n "$client_id"; do
  client_id="$(sed -n 's/^data:[[:space:]]*//p' "$test_dir/realtime.events" | head -n 1 | jq -r '.clientId // empty' 2>/dev/null || true)"
  attempt=$((attempt + 1))
  if test "$attempt" -ge 30 || ! kill -0 "$sse_pid" 2>/dev/null; then
    printf 'error=realtime_connection_failed\n'
    exit 1
  fi
  sleep 1
done
subscription_body="$(jq -nc \
  --arg clientId "$client_id" \
  --arg topic "instancias_carga_boletin/$workflow_id" \
  '{clientId:$clientId,subscriptions:[$topic]}')"
curl -fsS http://127.0.0.1:18091/api/realtime \
  -X POST \
  -H "Authorization: $user_token" \
  -H 'Content-Type: application/json' \
  --data-binary "$subscription_body" >/dev/null
printf 'stage=realtime_subscribed\n'

write_body="$(jq -nc \
  --arg periodId "$period_id" \
  --argjson expectedRevision "$initial_revision" \
  '{periodoId:$periodId,expectedRevision:$expectedRevision,materias:[],cierre:{},apoyos:{}}')"
write_url="http://127.0.0.1:18091/api/cys/directivo/alumnos/$enrollment_id"

curl -sS -o "$test_dir/first.json" -w '%{http_code}' "$write_url" \
  -X PUT \
  -H "Authorization: $user_token" \
  -H 'Content-Type: application/json' \
  --data-binary "$write_body" >"$test_dir/first.status" &
first_pid="$!"
curl -sS -o "$test_dir/second.json" -w '%{http_code}' "$write_url" \
  -X PUT \
  -H "Authorization: $user_token" \
  -H 'Content-Type: application/json' \
  --data-binary "$write_body" >"$test_dir/second.status" &
second_pid="$!"
wait "$first_pid"
wait "$second_pid"

first_status="$(cat "$test_dir/first.status")"
second_status="$(cat "$test_dir/second.status")"
statuses="$(printf '%s\n%s\n' "$first_status" "$second_status" | sort | tr '\n' ' ' | sed 's/ $//')"
test "$statuses" = "200 409"

if test "$first_status" = "200"; then
  success_file="$test_dir/first.json"
  conflict_file="$test_dir/second.json"
else
  success_file="$test_dir/second.json"
  conflict_file="$test_dir/first.json"
fi

confirmed_revision="$(jq -er '.instancia.revision' "$success_file")"
conflict_revision="$(jq -er '.currentRevision' "$conflict_file")"
expected_confirmed_revision=$((initial_revision + 1))
test "$confirmed_revision" -eq "$expected_confirmed_revision"
test "$conflict_revision" -eq "$expected_confirmed_revision"

attempt=0
until grep -q "\"revision\":$expected_confirmed_revision" "$test_dir/realtime.events"; do
  attempt=$((attempt + 1))
  if test "$attempt" -ge 30 || ! kill -0 "$sse_pid" 2>/dev/null; then
    printf 'error=realtime_update_missing\n'
    exit 1
  fi
  sleep 1
done
kill "$sse_pid" 2>/dev/null || true
wait "$sse_pid" 2>/dev/null || true
sse_pid=""

printf 'concurrency_test=passed realtime=passed statuses=%s initial_revision=%s confirmed_revision=%s\n' \
  "$statuses" "$initial_revision" "$confirmed_revision"
