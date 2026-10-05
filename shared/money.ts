export type FiatCurrency = "USD" | "GBP" | "EUR";
export type AssetIdentity = FiatCurrency | "DLC_INTERNAL" | "DLC_ERC20" | "EU";
export class Money {
  private constructor(public readonly amountMinor:bigint,public readonly currency:FiatCurrency) {}
  static fromMinor(amount:bigint|number|string,currency:string) {
    if (!["USD","GBP","EUR"].includes(currency.toUpperCase())) throw new Error("INVALID_CURRENCY");
    if (typeof amount==="number" && !Number.isSafeInteger(amount)) throw new Error("INVALID_MONEY");
    const value=BigInt(amount);
    if (value<BigInt(0)) throw new Error("INVALID_MONEY");
    return new Money(value,currency.toUpperCase() as FiatCurrency);
  }
  static parse(value:string,currency:string) {
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error("INVALID_MONEY");
    const [whole,fraction=""]=value.split(".");
    return Money.fromMinor(BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,"0")),currency);
  }
  private same(other:Money) { if(other.currency!==this.currency)throw new Error("CURRENCY_MISMATCH"); }
  add(other:Money) { this.same(other);return Money.fromMinor(this.amountMinor+other.amountMinor,this.currency); }
  subtract(other:Money) { this.same(other);return Money.fromMinor(this.amountMinor-other.amountMinor,this.currency); }
  compare(other:Money) { this.same(other);return this.amountMinor===other.amountMinor?0:this.amountMinor<other.amountMinor?-1:1; }
  multiply(quantity:number) {
    if(!Number.isSafeInteger(quantity)||quantity<0)throw new Error("INVALID_QUANTITY");
    return Money.fromMinor(this.amountMinor*BigInt(quantity),this.currency);
  }
  format() { return `${this.amountMinor/BigInt(100)}.${String(this.amountMinor%BigInt(100)).padStart(2,"0")}`; }
  stripeAmount() {
    if(this.amountMinor>BigInt(Number.MAX_SAFE_INTEGER))throw new Error("INVALID_MONEY");
    return Number(this.amountMinor);
  }
  toJSON() { return {amountMinor:this.amountMinor.toString(),currency:this.currency}; }
}
export class AssetAmount {
  constructor(public readonly asset:AssetIdentity,public readonly amountAtomic:bigint,public readonly decimals:number) {
    if(!["USD","GBP","EUR","DLC_INTERNAL","DLC_ERC20","EU"].includes(asset)||
      !Number.isInteger(decimals)||decimals<0||decimals>18||amountAtomic<BigInt(0))throw new Error("INVALID_ASSET_AMOUNT");
  }
  static parse(asset:AssetIdentity,value:string,decimals:number) {
    if(!/^\d+(\.\d+)?$/.test(value))throw new Error("INVALID_ASSET_AMOUNT");
    const [whole,fraction=""]=value.split(".");
    if(fraction.length>decimals)throw new Error("INVALID_ASSET_AMOUNT");
    if(!Number.isInteger(decimals)||decimals<0||decimals>18)throw new Error("INVALID_ASSET_AMOUNT");
    return new AssetAmount(asset,BigInt(whole)*BigInt("1"+"0".repeat(decimals))+BigInt(fraction.padEnd(decimals,"0")||"0"),decimals);
  }
  add(other:AssetAmount) {
    if(other.asset!==this.asset||other.decimals!==this.decimals)throw new Error("ASSET_MISMATCH");
    return new AssetAmount(this.asset,this.amountAtomic+other.amountAtomic,this.decimals);
  }
  format() {
    if(!this.decimals)return this.amountAtomic.toString();
    const scale=BigInt("1"+"0".repeat(this.decimals));
    return `${this.amountAtomic/scale}.${String(this.amountAtomic%scale).padStart(this.decimals,"0")}`;
  }
  toJSON() { return {asset:this.asset,amountAtomic:this.amountAtomic.toString(),decimals:this.decimals}; }
}
