export default function GizlilikPage() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Gizlilik Politikası</h1>
        <div className="prose prose-sm text-slate-600 space-y-4">
          <p>
            Bu gizlilik politikası, aSistan platformunun kişisel verilerinizi nasıl topladığını,
            kullandığını ve koruduğunu açıklamaktadır.
          </p>
          <h2 className="text-base font-semibold text-slate-700">Toplanan Veriler</h2>
          <p>
            Platformumuzu kullandığınızda ad, soyad, e-posta adresi, telefon numarası gibi
            kişisel veriler toplanabilir.
          </p>
          <h2 className="text-base font-semibold text-slate-700">Verilerin Kullanımı</h2>
          <p>
            Toplanan veriler yalnızca hizmet sunumu amacıyla kullanılır ve üçüncü taraflarla
            paylaşılmaz.
          </p>
          <h2 className="text-base font-semibold text-slate-700">İletişim</h2>
          <p>
            Gizlilik politikamızla ilgili sorularınız için{" "}
            <a href="mailto:assist@aSistan.com" className="text-blue-600 hover:underline">
              assist@aSistan.com
            </a>{" "}
            adresine ulaşabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
