"use client";
import type {CSSProperties} from 'react';
import UiIcon from './ui-icon';
import {useHomeScene,SceneProgress} from './use-home-scene';

// User workflows, not processes or services. PDF workspaces form one area.
export const platformModules=[
 ['upload','Optik değerlendirme'],['sliders','FMT tanıma'],['search','Sınav önerisi'],['results','Puan ve sıralama'],
 ['activity','Kazanım analizi'],['document','Rapor ve belge araçları'],['users','Öğrenci ve kurum'],['folder','Veri yönetimi'],
 ['key','Güvenlik ve yetki'],['list','Duyuru merkezi'],['book','Kullanım rehberi'],['share','Zamanlanmış paylaşım'],
];
const positions=[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1]];
// Preparation → evaluation → results → reports; publication → announcements.
const flows=[[7,1],[1,2],[2,0],[0,3],[3,4],[4,5],[3,6],[5,11],[7,9],[9,6],[10,0],[8,6]];
export default function SystemArchitecture(){
 const {root,step,controls}=useHomeScene(10800,platformModules.length-1);
 return <section ref={root} className="system-architecture" aria-label="Platformun işlevsel alanlarının temsili akışı">
  <div className="architecture-heading"><span>{platformModules.length} işlevsel alan. Tek platform.</span><small>Kullanıcı iş akışlarının temsili gösterimi</small></div>
  <div className="architecture-map"><svg viewBox="0 0 480 480" preserveAspectRatio="none" aria-hidden="true">{flows.map(([from,to],i)=>{
   const [a,b]=positions[from],[c,d]=positions[to],path=`M${a*120+60} ${b*120+60} L${c*120+60} ${d*120+60}`;
   return <g key={i}><path d={path}/><path className="architecture-flow" pathLength="100" style={{'--flow-offset':i/flows.length} as CSSProperties} d={path}/></g>;
  })}</svg><div className="architecture-core" aria-hidden="true">K</div>
  {platformModules.map(([icon,name],i)=><div style={{gridColumn:positions[i][0]+1,gridRow:positions[i][1]+1}} className="architecture-module" data-area={i===8?"security":undefined} data-active={step===i} key={name}><UiIcon name={icon}/><span>{name}</span><i aria-hidden="true"/></div>)}</div>
  <SceneProgress/>{controls}
 </section>;
}
