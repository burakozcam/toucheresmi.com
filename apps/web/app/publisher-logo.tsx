"use client";
import {useEffect,useState} from "react";
import {API_URL} from "../lib/api";
/** Used only inside public answer-key sections. The written publisher name always remains visible. */
export default function PublisherLogo({id,name}:{id:string;name:string}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[id]);return failed?null:<img className="publisher-answer-logo" src={`${API_URL}/api/publishers/${encodeURIComponent(id)}/logo`} alt={`${name} logosu`} loading="lazy" onError={()=>setFailed(true)}/>;}
