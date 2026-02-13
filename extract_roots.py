import re
import subprocess

with open('nginx/certs/trust_chain.pem', 'r') as f:
    content = f.read()

certs = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', content, re.DOTALL)

# Write all certificates to dod_roots.pem to ensure Intermediates are included
with open('nginx/certs/dod_roots.pem', 'w') as f:
    f.write(content)

print(f"Extracted {len(certs)} certificates (Roots + Intermediates) to nginx/certs/dod_roots.pem.")
