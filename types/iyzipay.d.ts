declare module "iyzipay" {
  interface IyzipayConfig {
    apiKey: string
    secretKey: string
    uri: string
  }

  interface IyzipayStatic {
    LOCALE: { TR: string; EN: string }
    CURRENCY: { TRY: string; USD: string; EUR: string }
    PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string }
    BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string }
  }

  class Iyzipay {
    constructor(config: IyzipayConfig)
    checkoutFormInitialize: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create(request: any, callback: (err: any, result: any) => void): void
    }
    checkoutForm: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      retrieve(request: any, callback: (err: any, result: any) => void): void
    }
    static LOCALE: { TR: string; EN: string }
    static CURRENCY: { TRY: string; USD: string; EUR: string }
    static PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string }
    static BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string }
  }

  export = Iyzipay
}
