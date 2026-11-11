import {env} from "./config";
import type {HumanConfig} from "./human-verification";
export function humanVerificationConfig():HumanConfig{
 if(env.RECAPTCHA_ENABLED==="true")return {enabled:true,provider:"recaptcha-v2",secret:env.RECAPTCHA_SECRET_KEY,siteKey:env.RECAPTCHA_SITE_KEY,hostname:env.RECAPTCHA_HOSTNAME};
 return {enabled:env.TURNSTILE_ENABLED==="true",secret:env.TURNSTILE_SECRET_KEY,siteKey:env.TURNSTILE_SITE_KEY,hostname:env.TURNSTILE_HOSTNAME};
}
