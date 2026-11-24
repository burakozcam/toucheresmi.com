import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const alt='KurumsalSınav · Geçici Erişim · Süreli araçlara güvenli giriş';
export const size={width:1200,height:630};
export const contentType='image/png';
export default async function Image(){
 const [regular,bold]=await Promise.all(['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf'].map(name=>readFile(join(process.cwd(),'public/fonts',name))));
 return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#142237',color:'#fff',fontFamily:'Liberation Sans'}}><div style={{display:'flex',alignItems:'center',gap:24}}><span style={{display:'flex',alignItems:'center',justifyContent:'center',width:100,height:100,borderRadius:24,background:'#192e53',fontSize:64,fontWeight:700}}>K</span><span style={{fontSize:66,fontWeight:700}}>kurumsal<span style={{color:'#8bb2ff'}}>sinav.com</span></span></div><div style={{fontSize:38,color:'#79ddb1',marginTop:48}}>Geçici Erişim</div><div style={{fontSize:24,color:'#d9e3f2',marginTop:20}}>Süreli araçlara güvenli giriş</div></div>,{...size,fonts:[{name:'Liberation Sans',data:regular,weight:400,style:'normal'},{name:'Liberation Sans',data:bold,weight:700,style:'normal'}]});
}
