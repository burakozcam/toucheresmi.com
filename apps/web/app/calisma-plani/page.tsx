import type { Metadata } from 'next';
import Link from 'next/link';
import ThemeToggle from '../theme-toggle';
import Planner from './planner';
import './planner.css';

export const metadata: Metadata = { title: 'Çalışma Planı Oluştur', description: 'Derslerini ve kendine ayırdığın zamanı haftalık takvimde planla. Ücretsiz, girişsiz; PDF, JPG ve Excel olarak indir.', alternates: { canonical: '/calisma-plani' } };
export default function StudyPlannerPage() {
  return <main className="study-page"><header className="landing-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsalsinav.com</span></Link><nav className="header-actions"><ThemeToggle/><Link className="header-link" href="/">Ana Sayfa</Link></nav></header><Planner/></main>;
}
