import {ControlError} from "../safety/primitives";

export function configuredPaymentMode():boolean {
  return process.env.COMMERCE_PAYMENT_MODE==="live";
}
export function authorizeProviderMode(livemode:unknown, expected=configuredPaymentMode()) {
  if(typeof livemode!=="boolean"||livemode!==expected)
    throw new ControlError("PROVIDER_MODE_MISMATCH",503);
  if(livemode&&process.env.COMMERCE_LIVE_AUTHORIZED!=="true")
    throw new ControlError("LIVE_AUTHORIZATION_REQUIRED",503);
  return livemode;
}
export function paymentOrigin() {
  const configured=process.env.PUBLIC_APP_ORIGIN;
  if(process.env.NODE_ENV==="production"&&!configured)
    throw new ControlError("PUBLIC_APP_ORIGIN_REQUIRED",503);
  const url=new URL(configured||`https://${process.env.REPLIT_DEV_DOMAIN||"divinemoney.org"}`);
  if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash)
    throw new ControlError("INVALID_PUBLIC_APP_ORIGIN",503);
  return url.origin;
}
