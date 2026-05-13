import { redirect } from "next/navigation"

/** Eski URL; «Çalışma saatleri» artık Çalışanlar sekmesinin parçasıdır. */
export default function CalismaSaatleriPage() {
  redirect("/ayarlar/calisanlar?tab=saatler")
}
