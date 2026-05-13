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
      create(request: unknown, callback: (err: unknown, result: unknown) => void): void
    }
    checkoutForm: {
      retrieve(request: unknown, callback: (err: unknown, result: unknown) => void): void
    }
    static LOCALE: { TR: string; EN: string }
    static CURRENCY: { TRY: string; USD: string; EUR: string }
    static PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string }
    static BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string }
  }

  export = Iyzipay
}
