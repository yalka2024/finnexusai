# Penetration Testing
- Automated: OWASP ZAP in CI for web vulnerabilities
- Manual: NCC Group, Bishop Fox, Trail of Bits
- Steps: Recon, exploit, report, remediation
# Security & Encryption

## HTTPS Setup
- Use Nginx or cloud provider SSL for all endpoints.
- Enforce HTTPS in production.

## Data Encryption
- Use Node.js crypto for sensitive data at rest.
- Example:

```js
const crypto = require('crypto');
function encrypt(text, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```
