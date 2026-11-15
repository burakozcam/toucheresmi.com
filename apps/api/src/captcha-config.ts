import {env} from "./config";
import type {HumanConfig} from "./human-verification";
export function humanVerificationConfig():HumanConfig{
 if(env.RECAPTCHA_ENABLED==="true"&&env.RECAPTCHA_VERSION==="v2")return {enabled:true,provider:"recaptcha-v2",secret:env.RECAPTCHA_V2_SECRET_KEY,siteKey:env.RECAPTCHA_V2_SITE_KEY,hostname:env.RECAPTCHA_HOSTNAME||new URL(env.WEB_ORIGIN).hostname};
 if(env.RECAPTCHA_ENABLED==="true")return {enabled:true,provider:"recaptcha-v3",secret:env.RECAPTCHA_SECRET_KEY,siteKey:env.RECAPTCHA_SITE_KEY,hostname:env.RECAPTCHA_HOSTNAME||new URL(env.WEB_ORIGIN).hostname,minScore:env.RECAPTCHA_MIN_SCORE};
 return {enabled:env.TURNSTILE_ENABLED==="true",secret:env.TURNSTILE_SECRET_KEY,siteKey:env.TURNSTILE_SITE_KEY,hostname:env.TURNSTILE_HOSTNAME};
}
