# Secret Rotation and Management

## Overview

This document describes how to safely manage and rotate secrets for the Tele-bot-cloudflared application.

## Secrets Managed by Cloudflare

All sensitive values are stored in Cloudflare Worker Secrets, not in source code or environment files.

### List of Secrets

1. **BOT_TOKEN** - Telegram bot token from @BotFather
2. **WEBHOOK_SECRET** - Secret token for Telegram webhook validation (minimum 16 characters)
3. **ADMIN_API_SECRET** - Admin dashboard access secret (minimum 24 characters)
4. **ADMIN_IDS** - Comma-separated numeric Telegram user IDs
5. **ODDS_API_KEY** - The Odds API key (optional)
6. **SECURITY_CODE_PEPPER** - HMAC pepper for withdrawal security codes (minimum 16 characters)
7. **BANK_DETAILS, BOC_DETAILS, PEOPLES_DETAILS, SAMPATH_DETAILS, LOLC_DETAILS** - Bank account details
8. **EZCASH_NUMBER, MCASH_NUMBER, FRIMI_NUMBER, IPAY_NUMBER** - Mobile money details
9. **WHATSAPP_NUMBER** - Support contact number
10. **XBET_LINK, XBET_PROMO_CODE** - Affiliate details
11. **R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID** - Cloudflare R2 credentials

## Secret Rotation Procedure

### Quarterly Rotation (Every 90 Days)

1. **Webhook Secret Rotation:**
   ```bash
   # Generate new secret
   NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   
   # Set in Cloudflare
   echo "$NEW_SECRET" | npx wrangler secret put WEBHOOK_SECRET
   
   # Update Telegram webhook
   curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<PUBLIC_BASE_URL>/webhook&secret_token=$NEW_SECRET"
   
   # Verify
   curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
   ```

2. **Admin API Secret Rotation:**
   ```bash
   # Generate new secret
   NEW_ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
   
   # Set in Cloudflare
   echo "$NEW_ADMIN_SECRET" | npx wrangler secret put ADMIN_API_SECRET
   
   # Note: Existing admin sessions will be invalidated after deployment
   # Admin users must re-login after this change
   ```

3. **Security Code Pepper Rotation:**
   ```bash
   # Generate new pepper
   NEW_PEPPER=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   
   # Set in Cloudflare
   echo "$NEW_PEPPER" | npx wrangler secret put SECURITY_CODE_PEPPER
   
   # Note: Existing withdrawal security codes will need to be re-hashed
   # This requires a migration or manual update
   ```

### Emergency Rotation (Suspected Compromise)

If any secret is suspected to be compromised:

1. **Immediately rotate affected secrets** using the procedures above
2. **Review audit logs** in D1 and R2 for suspicious activity
3. **Check webhook delivery logs** in Telegram
4. **Notify users if payment data may be at risk**
5. **Update security incidents tracker**

## Setup Process

Use the secure setup script to provision secrets:

```bash
# Use the secure script that does NOT print secrets to terminal
bash scripts/setup-cf-secrets-secure.sh
```

This script will:
- Prompt for secrets without echoing to terminal
- Generate random secrets without displaying them
- Store secrets only in Cloudflare
- Create temporary files in /tmp/ for you to securely save generated values

## Best Practices

1. **Never commit secrets to Git**
   - `.gitignore` must block `.env*` files
   - Verify with: `git status --ignored`

2. **Never print secrets to terminal or logs**
   - Use secure input prompts
   - Redirect secrets directly to `wrangler secret put`
   - Do not use `echo` or `cat` with secret values

3. **Secure storage of generated secrets**
   - Save generated secrets in a secure password manager
   - Do not leave temporary files on shared machines
   - Use file permission `600` for any temporary files

4. **Access control**
   - Limit access to Cloudflare account to necessary personnel
   - Use Cloudflare account security best practices (2FA, API tokens)
   - Audit Cloudflare API access logs regularly

5. **Monitoring**
   - Monitor for unusual webhook failures or auth errors
   - Track failed admin login attempts
   - Review D1 audit logs for suspicious patterns

## Validation

After rotation, verify secrets are working:

```bash
# Test webhook (should return 200 or 401 with proper Telegram signature)
curl -X POST https://<your-worker-url>/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: <WEBHOOK_SECRET>" \
  -d '{"update_id": 0}'

# Test admin auth (should return 200 for valid session or 401 for invalid)
curl -X GET https://<your-worker-url>/api/admin/status \
  -H "Cookie: admin_session=<valid-session-token>"

# Test bot status (public, no auth needed)
curl https://<your-worker-url>/api/status
```

## Incident Response

If a secret is compromised:

1. **Immediate actions:**
   - Rotate the compromised secret immediately
   - Deploy the updated Worker
   - Check for abuse patterns in logs

2. **Investigation:**
   - Review D1 audit logs for unauthorized actions
   - Check R2 access logs for unauthorized downloads
   - Check Telegram webhook delivery failures

3. **Communication:**
   - Document the incident
   - Notify team members
   - Update security procedures if needed

## References

- Cloudflare Workers Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Telegram Bot Security: https://core.telegram.org/bots/api#setwebhook
- OWASP Secret Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
