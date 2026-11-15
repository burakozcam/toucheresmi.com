"use client";

const reportOptions = [
  { id: "summary-card", label: "1 sayfa · Özet", detail: "Başarı, tüm ders cevapları ve öncelikler" },
  { id: "two-page-card", label: "2 sayfa · Ayrıntılı", detail: "Sonuç belgesi ve ayrıntılı kazanımlar" },
  { id: "detailed-card", label: "Kazanımlı karne", detail: "Soru ve kazanım ayrıntıları" },
];

export default function ReportTypeButtons({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <section className="report-type-choice">
    <h3>Öğrenci karnesi biçimi</h3>
    <div role="group" aria-label="Öğrenci karnesi türü" className="report-type-buttons">
      {reportOptions.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} className={`button ${value === option.id ? "button-navy" : "button-quiet"}`} onClick={() => onChange(option.id)}>
        <strong>{option.label}</strong><small>{option.detail}</small>
      </button>)}
    </div>
  </section>;
}
