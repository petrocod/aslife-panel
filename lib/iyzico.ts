/* eslint-disable @typescript-eslint/no-explicit-any */
import Iyzipay from "iyzipay"

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY || "",
  secretKey: process.env.IYZICO_SECRET_KEY || "",
  uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
})

export type CheckoutItem = {
  id: string
  name: string
  category: string
  price: string
  type: "PHYSICAL" | "VIRTUAL"
}

export type CheckoutParams = {
  conversationId: string
  price: string
  paidPrice: string
  basketId: string
  buyerEmail: string
  buyerName: string
  buyerSurname: string
  buyerPhone: string
  buyerIp: string
  buyerId: string
  buyerCity?: string
  buyerCountry?: string
  buyerAddress?: string
  items: CheckoutItem[]
  callbackUrl: string
}

export function createCheckoutForm(
  params: CheckoutParams
): Promise<{ status: string; checkoutFormContent?: string; token?: string; errorMessage?: string }> {
  return new Promise((resolve) => {
    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: params.conversationId,
      price: params.price,
      paidPrice: params.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: params.basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1, 2, 3, 6],
      buyer: {
        id: params.buyerId,
        name: params.buyerName,
        surname: params.buyerSurname,
        gsmNumber: params.buyerPhone,
        email: params.buyerEmail,
        identityNumber: "11111111111",
        registrationAddress: params.buyerAddress || "Istanbul, Turkey",
        ip: params.buyerIp,
        city: params.buyerCity || "Istanbul",
        country: params.buyerCountry || "Turkey",
      },
      shippingAddress: {
        contactName: `${params.buyerName} ${params.buyerSurname}`,
        city: params.buyerCity || "Istanbul",
        country: params.buyerCountry || "Turkey",
        address: params.buyerAddress || "Istanbul, Turkey",
      },
      billingAddress: {
        contactName: `${params.buyerName} ${params.buyerSurname}`,
        city: params.buyerCity || "Istanbul",
        country: params.buyerCountry || "Turkey",
        address: params.buyerAddress || "Istanbul, Turkey",
      },
      basketItems: params.items.map((item) => ({
        id: item.id,
        name: item.name,
        category1: item.category,
        itemType: item.type === "VIRTUAL" ? Iyzipay.BASKET_ITEM_TYPE.VIRTUAL : Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: item.price,
      })),
    }

    iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
      if (err) {
        resolve({ status: "failure", errorMessage: err.message || "Bağlantı hatası" })
        return
      }
      resolve(result)
    })
  })
}

export function retrieveCheckoutForm(
  token: string
): Promise<{ status: string; paymentId?: string; price?: number; paidPrice?: number; errorMessage?: string; conversationId?: string; basketId?: string }> {
  return new Promise((resolve) => {
    iyzipay.checkoutForm.retrieve(
      { locale: Iyzipay.LOCALE.TR, token },
      (err: any, result: any) => {
        if (err) {
          resolve({ status: "failure", errorMessage: err.message || "Doğrulama hatası" })
          return
        }
        resolve(result)
      }
    )
  })
}
