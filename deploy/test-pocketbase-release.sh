set -eu
stage="${1:?}"
case "$stage" in /root/cys-workflow-*) ;; *) exit 2 ;; esac
test -d "$stage/pb_migrations"
trial="$(mktemp -d /root/pb/release-test-XXXXXX)"
trap 'case "$trial" in /root/pb/release-test-*) rm -rf -- "$trial" ;; esac' EXIT
python3 - "$trial" <<'PY'
import sqlite3,sys
source=sqlite3.connect('file:/root/pb/pb_data/data.db?mode=ro',uri=True)
target=sqlite3.connect(sys.argv[1]+'/data.db')
source.backup(target)
tables={r[0] for r in target.execute("select name from sqlite_master where type='table'")}
for table in ['tokens_acceso_docente','users','_admins']:
    if table in tables: target.execute('delete from "'+table+'"')
for table in ['alumnos','responsables','inscripciones','cierres_periodo_alumno']:
    if table not in tables: continue
    columns={r[1] for r in target.execute('pragma table_info("'+table+'")')}
    for column in ['apellidos','nombres','dni','telefono','email','domicilio','usuario_acadeu','clave_acadeu','observaciones','cuales_apoyos','profesion','nacionalidad']:
        if column in columns: target.execute('update "'+table+'" set "'+column+'" = ?',('Prueba aislada',))
target.commit()
target.close()
source.close()
PY
/root/pb/pocketbase migrate up --dir="$trial" --migrationsDir="$stage/pb_migrations"
python3 - "$trial" <<'PY'
import sqlite3,sys
db=sqlite3.connect(sys.argv[1]+'/data.db')
assert db.execute("select count(*) from _collections where name='emisiones_boletin'").fetchone()[0]==1
assert 'generacion_visado' in {r[1] for r in db.execute('pragma table_info(visados_boletin)')}
print('Isolated migration check passed')
PY
