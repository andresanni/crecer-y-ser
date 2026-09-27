set -eu

stage_dir="${1:?}"
release_id="${2:?}"

case "$stage_dir" in
  /root/cys-workflow-*) ;;
  *) exit 2 ;;
esac

test -f "$stage_dir/teacherAccess.js"
test -f "$stage_dir/teacher_access.pb.js"
test -f "$stage_dir/curriculum.js"
test -f "$stage_dir/curriculum.pb.js"
test -f "$stage_dir/contactService.js"
test -f "$stage_dir/contacto.pb.js"
test -f "$stage_dir/1789330000_created_initial_collections.js"
test -f "$stage_dir/1789334557_hardened_teacher_access_tokens.js"
test -f "$stage_dir/1789338120_close_public_gradebook_rules.js"
test -f "$stage_dir/1789342800_created_gradebook_workflows.js"
test -f "$stage_dir/1789346400_simplified_unidirectional_gradebook_workflow.js"
test -f "$stage_dir/1789471993_removed_teacher_access_expiration.js"
test -f "$stage_dir/1789474000_added_recoverable_teacher_links.js"
test -f "$stage_dir/1789477600_removed_teacher_link_state.js"
test -f "$stage_dir/1790364300_added_gradebook_approvals.js"
test -f "$stage_dir/1790364400_versioned_curriculum_by_cycle.js"
test -f "$stage_dir/pocketbase.service"
test -s /root/pb/teacher-link.env
test "$(stat -c '%a' /root/pb/teacher-link.env)" = "600"
grep -q '^CYS_TEACHER_LINK_KEY=................................$' /root/pb/teacher-link.env

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
if test -f /root/pb/pb_migrations/1789330000_created_initial_collections.js; then
  cp -a /root/pb/pb_migrations/1789330000_created_initial_collections.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789334557_hardened_teacher_access_tokens.js; then
  cp -a /root/pb/pb_migrations/1789334557_hardened_teacher_access_tokens.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789338120_close_public_gradebook_rules.js; then
  cp -a /root/pb/pb_migrations/1789338120_close_public_gradebook_rules.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789342800_created_gradebook_workflows.js; then
  cp -a /root/pb/pb_migrations/1789342800_created_gradebook_workflows.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789346400_simplified_unidirectional_gradebook_workflow.js; then
  cp -a /root/pb/pb_migrations/1789346400_simplified_unidirectional_gradebook_workflow.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789471993_removed_teacher_access_expiration.js; then
  cp -a /root/pb/pb_migrations/1789471993_removed_teacher_access_expiration.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789474000_added_recoverable_teacher_links.js; then
  cp -a /root/pb/pb_migrations/1789474000_added_recoverable_teacher_links.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1789477600_removed_teacher_link_state.js; then
  cp -a /root/pb/pb_migrations/1789477600_removed_teacher_link_state.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1790364300_added_gradebook_approvals.js; then
  cp -a /root/pb/pb_migrations/1790364300_added_gradebook_approvals.js "$backup_dir/"
fi
if test -f /root/pb/pb_migrations/1790364400_versioned_curriculum_by_cycle.js; then
  cp -a /root/pb/pb_migrations/1790364400_versioned_curriculum_by_cycle.js "$backup_dir/"
fi
cp -a /etc/systemd/system/pocketbase.service "$backup_dir/pocketbase.service"

install -d -m 0755 /root/pb/pb_hooks/lib /root/pb/pb_migrations
install -m 0644 "$stage_dir/teacherAccess.js" /root/pb/pb_hooks/lib/teacherAccess.js
install -m 0644 "$stage_dir/teacher_access.pb.js" /root/pb/pb_hooks/teacher_access.pb.js
install -m 0644 "$stage_dir/curriculum.js" /root/pb/pb_hooks/lib/curriculum.js
install -m 0644 "$stage_dir/curriculum.pb.js" /root/pb/pb_hooks/curriculum.pb.js
install -m 0644 "$stage_dir/contactService.js" /root/pb/pb_hooks/lib/contactService.js
install -m 0644 "$stage_dir/contacto.pb.js" /root/pb/pb_hooks/contacto.pb.js
install -m 0644 "$stage_dir/1789330000_created_initial_collections.js" /root/pb/pb_migrations/1789330000_created_initial_collections.js
install -m 0644 "$stage_dir/1789334557_hardened_teacher_access_tokens.js" /root/pb/pb_migrations/1789334557_hardened_teacher_access_tokens.js
install -m 0644 "$stage_dir/1789338120_close_public_gradebook_rules.js" /root/pb/pb_migrations/1789338120_close_public_gradebook_rules.js
install -m 0644 "$stage_dir/1789342800_created_gradebook_workflows.js" /root/pb/pb_migrations/1789342800_created_gradebook_workflows.js
install -m 0644 "$stage_dir/1789346400_simplified_unidirectional_gradebook_workflow.js" /root/pb/pb_migrations/1789346400_simplified_unidirectional_gradebook_workflow.js
install -m 0644 "$stage_dir/1789471993_removed_teacher_access_expiration.js" /root/pb/pb_migrations/1789471993_removed_teacher_access_expiration.js
install -m 0644 "$stage_dir/1789474000_added_recoverable_teacher_links.js" /root/pb/pb_migrations/1789474000_added_recoverable_teacher_links.js
install -m 0644 "$stage_dir/1789477600_removed_teacher_link_state.js" /root/pb/pb_migrations/1789477600_removed_teacher_link_state.js
install -m 0644 "$stage_dir/1790364300_added_gradebook_approvals.js" /root/pb/pb_migrations/1790364300_added_gradebook_approvals.js
install -m 0644 "$stage_dir/1790364400_versioned_curriculum_by_cycle.js" /root/pb/pb_migrations/1790364400_versioned_curriculum_by_cycle.js
install -m 0644 "$stage_dir/pocketbase.service" /etc/systemd/system/pocketbase.service
systemctl daemon-reload

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
stage_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/cys/directivo/etapas/aaaaaaaaaaaaaaa)"
test "$stage_status" = "401"
review_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/cys/directivo/revision/aaaaaaaaaaaaaaa/bbbbbbbbbbbbbbb)"
test "$review_status" = "401"
curriculum_status="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE http://127.0.0.1:8090/api/cys/directivo/configuracion/materias/aaaaaaaaaaaaaaa)"
test "$curriculum_status" = "401"
contact_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8090/api/cys/contacto)"
test "$contact_status" = "400"
journalctl -u pocketbase --since "5 minutes ago" --no-pager
