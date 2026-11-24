import type {Metadata} from 'next';
import Link from 'next/link';
import DirectLogin from './direct-login';
export const metadata:Metadata={title:'Geçici Erişim',description:'KurumsalSınav geçici erişim bağlantısı.',robots:{index:false,follow:false},alternates:{canonical:'/gecici-giris'},openGraph:{title:'KurumsalSınav · Geçici Erişim',description:'Size tanımlanan süreli araçlara güvenle erişin.',url:'/gecici-giris',images:[{url:'/gecici-giris/opengraph-image',width:1200,height:630}]},twitter:{card:'summary_large_image',title:'KurumsalSınav · Geçici Erişim',description:'Süreli araçlara güvenli erişim.',images:['/gecici-giris/opengraph-image']}};
export default function Page(){return <main className="auth-page"><header className="auth-header"><Link className="brand" href="/"><span className="brand-mark">K</span>kurumsalsinav.com</Link></header><DirectLogin/></main>;}
