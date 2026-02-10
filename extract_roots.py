import re
import subprocess

with open('nginx/certs/trust_chain.pem', 'r') as f:
    content = f.read()

certs = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', content, re.DOTALL)

roots = []
print(f"File contains {len(certs)} certificates total.")

for i, cert in enumerate(certs):
    p = subprocess.Popen(['openssl', 'x509', '-noout', '-subject'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out, err = p.communicate(input=cert)
    
    # Check for DoD Root CAs specifically
    if "DoD Root CA 3" in out or "DoD Root CA 4" in out or "DoD Root CA 5" in out or "DoD Root CA 6" in out:
        print(f"Found Root CA: {out.strip()}")
        roots.append(cert)

with open('nginx/certs/dod_roots.pem', 'w') as f:
    # Ensure there's a newline between certificates
    f.write('\n'.join(roots) + '\n')

print(f"Extracted {len(roots)} Root CA certificates to nginx/certs/dod_roots.pem.")
