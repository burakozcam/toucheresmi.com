"use client";
import {Children,isValidElement,forwardRef,type ReactNode,type ButtonHTMLAttributes} from 'react';
import UiIcon from '../ui-icon';
export type ActionIntent='evaluate'|'advanced'|'danger'|'save'|'manage'|'neutral';
const icons:Record<ActionIntent,string>={evaluate:'check',advanced:'sliders',danger:'trash',save:'check',manage:'document',neutral:'document'};
type Props=ButtonHTMLAttributes<HTMLButtonElement>&{intent?:ActionIntent;loading?:boolean};
/** Presentation only: callers keep their handlers, disabled conditions and role checks. */
const ActionButton=forwardRef<HTMLButtonElement,Props>(function ActionButton({intent='neutral',loading=false,children,...props},ref){
 return <button {...props} ref={ref} data-intent={intent} aria-busy={loading||undefined}>
  {loading?<span className="action-spinner" aria-hidden="true"/>:intent!=='neutral'&&!hasIcon(children)?<UiIcon name={icons[intent]}/>:null}{children}
 </button>;
});
function hasIcon(children:ReactNode):boolean{return Children.toArray(children).some(child=>isValidElement(child)&&(child.type===UiIcon||hasIcon((child.props as {children?:ReactNode}).children)));}
export default ActionButton;
