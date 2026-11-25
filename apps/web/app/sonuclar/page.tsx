import Link from "next/link";
import ThemeToggle from "../theme-toggle";
import StudentPortal from "../student-portal";
import SiteFooter from "../site-footer";
export default function ResultsPage(){
 return <main className="public-results-page"><header className="landing-header"><Link href="/" className="brand"><span className="brand-mark">K</span><span>Kurumsal Sınav</span></Link><nav className="header-actions"><ThemeToggle/><Link className="header-link" href="/">Ana Sayfa</Link></nav></header><section className="public-results-card"><h1>Öğrenci Girişi</h1><StudentPortal/></section><SiteFooter/></main>;
}
