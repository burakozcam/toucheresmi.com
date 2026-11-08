import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata:Metadata={title:"Sonuçlarım",robots:{index:false,follow:false}};
export default function ReaderLayout({children}:{children:ReactNode}){return children;}
