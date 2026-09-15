set -eu

stage_dir="${1:?}"
release_id="${2:?}"

case "$stage_dir" in
  /root/cys-workflow-*) ;;
  *) exit 2 ;;
esac

test -f "$stage_dir/teacherAccess.js"
test -f "$stage_dir/teacher_access.pb.js"
test -f "$stage_dir/1789342800_created_gradebook_workflows.js"

backup_dir="/root/pb/deploy_backups/$release_id"
install -d -m 0700 "$backup_dir"

systemctl stop pocketbase
trap 'systemctl start pocketbase' EXIT

cp -a /root/pb/pb_data/data.db "$backup_dir/data.db"
if test -f /root/pb/pb_data/auxiliary.db; then
  cp -a /root/pb/pb_data/auxiliary.db "$backup_dir/auxiliary.db"
fi
if test -d /root/pb/pb_hooks; then
  cp -a /root/pb/pb_hooks "$backup_dir/pb_hooks"
fi
if test -f /root/pb/pb_migrations/1789342800_created_gradebook_workflows.js; then
  cp -a /root/pb/pb_migrations/1789342800_created_gradebook_workflows.js "$backup_dir/"
fi

install -d -m 0755 /root/pb/pb_hooks/lib /root/pb/pb_migrations
install -m 0644 "$stage_dir/teacherAccess.js" /root/pb/pb_hooks/lib/teacherAccess.js
install -m 0644 "$stage_dir/teacher_access.pb.js" /root/pb/pb_hooks/teacher_access.pb.js
install -m 0644 "$stage_dir/1789342800_created_gradebook_workflows.js" /root/pb/pb_migrations/1789342800_created_gradebook_workflows.js

systemctl start pocketbase
trap - EXIT

attempt=0
until curl -fsS http://127.0.0.1:8090/api/health; do
  attempt=$((attempt + 1))
  if test "$attempt" -ge 30 || ! systemctl is-active --quiet pocketbase; then
    journalctl -u pocketbase --since "5 minutes ago" --no-pager
    exit 1
  fi
  sleep 1
done
status_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/cys/directivo/instancias/aaaaaaaaaaaaaaa/bbbbbbbbbbbbbbb)"
test "$status_code" = "401"
journalctl -u pocketbase --since "5 minutes ago" --no-pager
