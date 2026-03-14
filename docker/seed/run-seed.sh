#!/bin/bash
# run-seed.sh – waits for Samba AD and imports test data
# Uses samba-tool for users (password handling) and ldapadd for OUs/groups
#
# Required environment variables:
#   LDAP_HOST            - IP/hostname of the Samba AD DC
#   LDAP_ADMIN_PASSWORD  - Administrator password
#   DOMAIN_DC            - Base DN (e.g. DC=lab,DC=dev)
#   REALM_LOWER          - Lowercase realm (e.g. lab.dev)

set -euo pipefail

# Process templates — replace __DOMAIN_DC__ placeholder with actual value
sed "s/__DOMAIN_DC__/${DOMAIN_DC}/g" /seed/structure.ldif.template > /tmp/structure.ldif
sed "s/__DOMAIN_DC__/${DOMAIN_DC}/g" /seed/groups.ldif.template > /tmp/groups.ldif

LDAP_URI="ldap://${LDAP_HOST}"
BIND_DN="CN=Administrator,CN=Users,${DOMAIN_DC}"
BIND_PW="${LDAP_ADMIN_PASSWORD}"
USER_PW="Test1234!"

echo "Waiting for Samba AD at ${LDAP_HOST}..."
until ldapsearch -x -H "${LDAP_URI}" \
    -D "${BIND_DN}" -w "${BIND_PW}" \
    -b "${DOMAIN_DC}" "(objectClass=domain)" > /dev/null 2>&1; do
  echo "   ... not ready yet, waiting 10s"
  sleep 10
done

echo "Samba AD is reachable — starting seed"

# Already seeded? Check if OU=Dev exists
EXISTING=$(ldapsearch -x -H "${LDAP_URI}" \
  -D "${BIND_DN}" -w "${BIND_PW}" \
  -b "${DOMAIN_DC}" "(ou=Dev)" dn 2>/dev/null | grep -c "dn:" || true)

if [ "${EXISTING}" -gt "0" ]; then
  echo "Test data already exists — skipping seed"
  exit 0
fi

echo "Importing OUs..."
ldapadd -x -H "${LDAP_URI}" \
  -D "${BIND_DN}" -w "${BIND_PW}" \
  -f /tmp/structure.ldif && echo "OUs imported"

echo ""
echo "Creating users via samba-tool..."

# patrick.blattner
samba-tool user create patrick.blattner "${USER_PW}" \
  --given-name="Patrick" --surname="Blattner" \
  --mail-address="patrick.blattner@${REALM_LOWER}" \
  --userou="OU=Users,OU=Dev" \
  -H "${LDAP_URI}" -U Administrator --password="${BIND_PW}"
echo "  patrick.blattner created"

ldapmodify -x -H "${LDAP_URI}" -D "${BIND_DN}" -w "${BIND_PW}" <<LDIF
dn: CN=Patrick Blattner,OU=Users,OU=Dev,${DOMAIN_DC}
changetype: modify
replace: displayName
displayName: Patrick Blattner
-
add: department
department: Engineering
-
add: title
title: Systems Engineer
-
add: telephoneNumber
telephoneNumber: +41 71 123 45 67
LDIF
echo "  patrick.blattner attributes set"

# angela.mueller
samba-tool user create angela.mueller "${USER_PW}" \
  --given-name="Angela" --surname="Mueller" \
  --mail-address="angela.mueller@${REALM_LOWER}" \
  --userou="OU=Users,OU=Dev" \
  -H "${LDAP_URI}" -U Administrator --password="${BIND_PW}"
echo "  angela.mueller created"

ldapmodify -x -H "${LDAP_URI}" -D "${BIND_DN}" -w "${BIND_PW}" <<LDIF
dn: CN=Angela Mueller,OU=Users,OU=Dev,${DOMAIN_DC}
changetype: modify
replace: displayName
displayName: Angela Mueller
-
add: department
department: Management
-
add: title
title: Project Manager
-
add: telephoneNumber
telephoneNumber: +41 71 123 45 68
LDIF
echo "  angela.mueller attributes set"

# max.tester
samba-tool user create max.tester "${USER_PW}" \
  --given-name="Max" --surname="Tester" \
  --mail-address="max.tester@${REALM_LOWER}" \
  --userou="OU=Users,OU=Dev" \
  -H "${LDAP_URI}" -U Administrator --password="${BIND_PW}"
echo "  max.tester created"

ldapmodify -x -H "${LDAP_URI}" -D "${BIND_DN}" -w "${BIND_PW}" <<LDIF
dn: CN=Max Tester,OU=Users,OU=Dev,${DOMAIN_DC}
changetype: modify
replace: displayName
displayName: Max Tester
-
add: department
department: QA
-
add: title
title: QA Engineer
LDIF
echo "  max.tester attributes set"

# svc.app (Service Account)
samba-tool user create svc.app "${USER_PW}" \
  --given-name="Service" --surname="App" \
  --userou="OU=ServiceAccounts,OU=Dev" \
  -H "${LDAP_URI}" -U Administrator --password="${BIND_PW}"
echo "  svc.app created"

ldapmodify -x -H "${LDAP_URI}" -D "${BIND_DN}" -w "${BIND_PW}" <<LDIF
dn: CN=Service App,OU=ServiceAccounts,OU=Dev,${DOMAIN_DC}
changetype: modify
replace: displayName
displayName: Service App Account
-
add: description
description: Service Account fuer LDAP-Binds der Applikation
LDIF
echo "  svc.app attributes set"

echo ""
echo "Importing groups..."
ldapadd -x -H "${LDAP_URI}" \
  -D "${BIND_DN}" -w "${BIND_PW}" \
  -f /tmp/groups.ldif && echo "Groups imported"

echo ""
echo "Seed complete!"
echo ""
echo "Bind DN:  ${BIND_DN}"
echo "Password: ${BIND_PW}"
echo "Base DN:  ${DOMAIN_DC}"
